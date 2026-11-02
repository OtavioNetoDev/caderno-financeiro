const { test } = require('node:test');
const assert = require('node:assert');
const { incomeReport } = require('../src/services/investmentService');

const day = (text) => new Date(text + 'T12:00:00-03:00');

const investments = [
  {
    _id: 'a',
    name: 'MXRF11',
    type: 'fii',
    entries: [
      { _id: 'e1', kind: 'contribution', amount: 100000, date: day('2026-09-01') },
      { _id: 'e2', kind: 'income', amount: 880, date: day('2026-09-14'), quantity: 100 },
      { _id: 'e3', kind: 'income', amount: 910, date: day('2026-10-14'), notes: 'outubro' },
    ],
  },
  {
    _id: 'b',
    name: 'CDB Banco',
    type: 'cdb',
    entries: [
      { _id: 'e4', kind: 'income', amount: 1500, date: day('2026-10-02') },
      { _id: 'e5', kind: 'redemption', amount: 5000, date: day('2026-10-03') },
    ],
  },
];

test('soma só os proventos, ignorando aportes e resgates', () => {
  const report = incomeReport(investments);
  assert.strictEqual(report.total, 880 + 910 + 1500);
  assert.strictEqual(report.count, 3);
});

test('lista do mais recente para o mais antigo, com o nome do investimento', () => {
  const report = incomeReport(investments);
  assert.deepStrictEqual(
    report.items.map((item) => item.id),
    ['e3', 'e4', 'e2'],
  );
  assert.strictEqual(report.items[0].investmentName, 'MXRF11');
  assert.strictEqual(report.items[0].notes, 'outubro');
  assert.strictEqual(report.items[2].quantity, 100);
});

test('filtra pelo período informado', () => {
  const report = incomeReport(investments, {
    from: new Date('2026-10-01T03:00:00.000Z'),
    to: new Date('2026-11-01T02:59:59.999Z'),
  });
  assert.strictEqual(report.total, 910 + 1500);
  assert.strictEqual(report.count, 2);
});

test('agrupa por investimento e por mês', () => {
  const report = incomeReport(investments);
  assert.deepStrictEqual(
    report.byInvestment.map((item) => [item.name, item.total, item.count]),
    [
      ['MXRF11', 1790, 2],
      ['CDB Banco', 1500, 1],
    ],
  );
  assert.deepStrictEqual(report.byMonth, [
    { month: '2026-09', total: 880 },
    { month: '2026-10', total: 2410 },
  ]);
});

test('sem proventos devolve tudo zerado', () => {
  const report = incomeReport([{ _id: 'x', name: 'Teste', type: 'other', entries: [] }]);
  assert.deepStrictEqual(
    { total: report.total, count: report.count, items: report.items },
    { total: 0, count: 0, items: [] },
  );
  assert.deepStrictEqual(report.byMonth, []);
});
