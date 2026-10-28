const { test } = require('node:test');
const assert = require('node:assert');
const report = require('../src/services/reportService');

test('assertMonth aceita AAAA-MM e rejeita o resto', () => {
  assert.strictEqual(report.assertMonth('2026-10'), '2026-10');
  for (const value of ['2026-13', '2026-1', '', undefined, '26-10']) {
    assert.throws(() => report.assertMonth(value), { status: 400 });
  }
});

test('parseMonthCount usa 6 por padrão e limita de 1 a 24', () => {
  assert.strictEqual(report.parseMonthCount(undefined), 6);
  assert.strictEqual(report.parseMonthCount('12'), 12);
  for (const value of ['0', '25', 'abc', '2.5']) {
    assert.throws(() => report.parseMonthCount(value), { status: 400 });
  }
});

test('monthsEndingAt atravessa a virada do ano', () => {
  assert.deepStrictEqual(report.monthsEndingAt('2026-02', 4), [
    '2025-11',
    '2025-12',
    '2026-01',
    '2026-02',
  ]);
  assert.deepStrictEqual(report.monthsEndingAt('2026-10', 1), ['2026-10']);
});

test('monthBounds usa UTC-3 e daysInMonth respeita ano bissexto', () => {
  const { start, end } = report.monthBounds('2026-10');
  assert.strictEqual(start.toISOString(), '2026-10-01T03:00:00.000Z');
  assert.strictEqual(end.toISOString(), '2026-11-01T03:00:00.000Z');
  assert.strictEqual(report.daysInMonth('2028-02'), 29);
  assert.strictEqual(report.daysInMonth('2026-02'), 28);
  assert.strictEqual(report.daysInMonth('2026-10'), 31);
});

test('assembleMonthly soma o cartão na despesa e calcula o lucro', () => {
  const months = ['2026-09', '2026-10'];
  const rows = [
    { _id: { month: '2026-09', type: 'income' }, total: 500000 },
    { _id: { month: '2026-09', type: 'expense' }, total: 200000 },
    { _id: { month: '2026-10', type: 'income' }, total: 400000 },
    { _id: { month: '2026-10', type: 'investment' }, total: 50000 },
  ];
  const result = report.assembleMonthly(months, rows, { '2026-10': 150000 });
  assert.deepStrictEqual(result.income, [500000, 400000]);
  assert.deepStrictEqual(result.expense, [200000, 150000]);
  assert.deepStrictEqual(result.cardExpense, [0, 150000]);
  assert.deepStrictEqual(result.investment, [0, 50000]);
  assert.deepStrictEqual(result.profit, [300000, 250000]);
});

test('assembleMonthly preenche meses sem lançamentos com zero', () => {
  const result = report.assembleMonthly(['2026-01', '2026-02'], []);
  assert.deepStrictEqual(result.income, [0, 0]);
  assert.deepStrictEqual(result.profit, [0, 0]);
});

test('assembleDaily devolve um valor por dia do mês', () => {
  const rows = [
    { _id: { day: '2026-10-03', type: 'expense' }, total: 1200 },
    { _id: { day: '2026-10-03', type: 'income' }, total: 5000 },
    { _id: { day: '2026-10-31', type: 'expense' }, total: 300 },
  ];
  const result = report.assembleDaily('2026-10', rows);
  assert.strictEqual(result.days.length, 31);
  assert.strictEqual(result.days[0], '2026-10-01');
  assert.strictEqual(result.expense[2], 1200);
  assert.strictEqual(result.income[2], 5000);
  assert.strictEqual(result.expense[30], 300);
  assert.strictEqual(
    result.investment.reduce((a, b) => a + b, 0),
    0,
  );
});

test('mergeTotals soma chaves iguais, ordena e descarta zeros', () => {
  const merged = report.mergeTotals(
    [
      { key: 'a', total: 100 },
      { key: 'b', total: 500 },
    ],
    [
      { key: 'a', total: 700 },
      { key: 'c', total: 0 },
      { key: null, total: 50 },
    ],
  );
  assert.deepStrictEqual(merged, [
    { key: 'a', total: 800 },
    { key: 'b', total: 500 },
    { key: null, total: 50 },
  ]);
});

test('assembleWeekdays devolve os 7 dias começando no domingo', () => {
  const result = report.assembleWeekdays([
    { _id: 1, total: 900 },
    { _id: 7, total: 100 },
  ]);
  assert.strictEqual(result.length, 7);
  assert.deepStrictEqual(result[0], { key: 'Dom', total: 900 });
  assert.deepStrictEqual(result[3], { key: 'Qua', total: 0 });
  assert.deepStrictEqual(result[6], { key: 'Sáb', total: 100 });
});
