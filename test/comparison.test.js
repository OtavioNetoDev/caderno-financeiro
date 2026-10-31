const { test } = require('node:test');
const assert = require('node:assert');
const comparison = require('../public/js/comparison.js');

const fmt = (cents) => 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');

test('change calcula diferença, percentual e direção', () => {
  const up = comparison.change(112500, 100000, 'up');
  assert.strictEqual(up.delta, 12500);
  assert.strictEqual(up.percent, 12.5);
  assert.strictEqual(up.direction, 'up');
  assert.strictEqual(up.tone, 'good');
  const down = comparison.change(75000, 100000, 'up');
  assert.strictEqual(down.percent, -25);
  assert.strictEqual(down.tone, 'bad');
});

test('para despesa, subir é ruim e descer é bom', () => {
  assert.strictEqual(comparison.change(120, 100, 'down').tone, 'bad');
  assert.strictEqual(comparison.change(80, 100, 'down').tone, 'good');
});

test('valor igual é neutro e mês anterior zerado não tem percentual', () => {
  const same = comparison.change(500, 500, 'up');
  assert.strictEqual(same.direction, 'same');
  assert.strictEqual(same.tone, 'neutral');
  const fromZero = comparison.change(500, 0, 'up');
  assert.strictEqual(fromZero.percent, null);
  assert.strictEqual(fromZero.direction, 'up');
});

test('lucro negativo no mês anterior usa o valor absoluto na base', () => {
  const result = comparison.change(-50, -100, 'up');
  assert.strictEqual(result.delta, 50);
  assert.strictEqual(result.percent, 50);
  assert.strictEqual(result.tone, 'good');
});

const monthly = {
  months: ['2026-08', '2026-09', '2026-10'],
  income: [100, 200, 300],
  expense: [50, 100, 80],
  profit: [50, 100, 220],
  investment: [0, 10, 10],
};

test('compareMonths usa os dois últimos meses da série', () => {
  const result = comparison.compareMonths(monthly);
  assert.strictEqual(result.month, '2026-10');
  assert.strictEqual(result.previousMonth, '2026-09');
  const byKey = Object.fromEntries(result.items.map((item) => [item.key, item]));
  assert.strictEqual(byKey.income.current, 300);
  assert.strictEqual(byKey.income.previous, 200);
  assert.strictEqual(byKey.expense.tone, 'good');
  assert.strictEqual(byKey.investment.direction, 'same');
  assert.deepStrictEqual(
    result.items.map((item) => item.label),
    ['Receitas', 'Despesas', 'Lucro', 'Investido'],
  );
});

test('compareMonths devolve null sem dados suficientes', () => {
  assert.strictEqual(comparison.compareMonths(null), null);
  assert.strictEqual(comparison.compareMonths({ months: ['2026-10'] }), null);
  assert.strictEqual(comparison.compareMonths({}), null);
});

test('describeChange mostra seta, percentual e valor', () => {
  const up = comparison.change(112500, 100000, 'up');
  assert.strictEqual(comparison.describeChange(up, fmt), '▲ 12,5% (+R$ 125,00)');
  const down = comparison.change(75000, 100000, 'up');
  assert.strictEqual(comparison.describeChange(down, fmt), '▼ 25% (−R$ 250,00)');
});

test('describeChange trata igual e mês anterior zerado', () => {
  assert.strictEqual(
    comparison.describeChange(comparison.change(5, 5, 'up'), fmt),
    '= igual ao mês anterior',
  );
  assert.strictEqual(
    comparison.describeChange(comparison.change(500, 0, 'up'), fmt),
    '▲ +R$ 5,00 (mês anterior zerado)',
  );
});
