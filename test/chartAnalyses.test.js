const { test } = require('node:test');
const assert = require('node:assert');
const { ANALYSES, ALL_TYPES, monthLabel, makeNames } = require('../public/js/chart-analyses.js');

const names = makeNames([{ _id: 'c1', name: 'Mercado' }], [{ _id: 'a1', name: 'Nubank' }]);

test('monthLabel abrevia o mês em português', () => {
  assert.strictEqual(monthLabel('2026-10'), 'out/26');
  assert.strictEqual(monthLabel('2027-01'), 'jan/27');
});

test('makeNames resolve ids e trata ausentes', () => {
  assert.strictEqual(names.category('c1'), 'Mercado');
  assert.strictEqual(names.category(null), 'Sem categoria');
  assert.strictEqual(names.category('zzz'), 'Sem categoria');
  assert.strictEqual(names.account('a1'), 'Nubank');
  assert.strictEqual(names.account('x'), 'Conta removida');
});

test('toda análise tem rótulo, períodos, tipo padrão válido e fonte de dados', () => {
  for (const [key, analysis] of Object.entries(ANALYSES)) {
    assert.ok(analysis.label, key);
    assert.ok(analysis.periods.includes(analysis.defaultPeriod), key);
    assert.ok(ALL_TYPES.includes(analysis.defaultType), key);
    assert.ok(typeof analysis.url === 'function' || typeof analysis.local === 'function', key);
  }
});

test('monthly gera quatro séries alinhadas aos meses', () => {
  const spec = ANALYSES.monthly.toSpec({
    months: ['2026-09', '2026-10'],
    income: [1, 2],
    expense: [3, 4],
    investment: [5, 6],
    profit: [-2, -2],
  });
  assert.deepStrictEqual(spec.categories, ['set/26', 'out/26']);
  assert.deepStrictEqual(
    spec.series.map((s) => s.name),
    ['Receitas', 'Despesas', 'Aportes', 'Lucro'],
  );
  assert.deepStrictEqual(spec.series[3].values, [-2, -2]);
});

test('monthly monta a URL com o mês final e a quantidade', () => {
  assert.strictEqual(ANALYSES.monthly.url('2026-10', 12), '/reports/monthly?end=2026-10&months=12');
  assert.strictEqual(
    ANALYSES.expenseByPerson.url('2026-10', 3),
    '/reports/breakdown?month=2026-10&by=person&type=expense&months=3',
  );
});

test('cumulative acumula receitas, despesas e calcula o saldo', () => {
  const spec = ANALYSES.cumulative.toSpec({
    days: ['2026-10-01', '2026-10-02', '2026-10-03'],
    income: [1000, 0, 500],
    expense: [200, 300, 0],
    investment: [0, 0, 0],
  });
  assert.deepStrictEqual(spec.categories, ['1', '2', '3']);
  assert.deepStrictEqual(spec.series[0].values, [1000, 1000, 1500]);
  assert.deepStrictEqual(spec.series[1].values, [200, 500, 500]);
  assert.deepStrictEqual(spec.series[2].values, [800, 500, 1000]);
});

test('despesas por categoria usam nomes e agrupam o excedente em "Outros"', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ key: 'k' + i, total: (i + 1) * 100 }));
  items.push({ key: 'c1', total: 5000 });
  items.push({ key: null, total: 50 });
  const spec = ANALYSES.expenseByCategory.toSpec({ items }, names);
  assert.strictEqual(spec.categories.length, 8);
  assert.strictEqual(spec.categories[0], 'Mercado');
  assert.strictEqual(spec.categories[7], 'Outros');
  const total = items.reduce((sum, item) => sum + item.total, 0);
  assert.strictEqual(
    spec.series[0].values.reduce((a, b) => a + b, 0),
    total,
  );
});

test('despesas por pessoa trata chave vazia', () => {
  const spec = ANALYSES.expenseByPerson.toSpec({
    items: [
      { key: 'Maria', total: 900 },
      { key: null, total: 100 },
    ],
  });
  assert.deepStrictEqual(spec.categories, ['Maria', 'Sem pessoa']);
});

test('dia da semana mantém a ordem de domingo a sábado', () => {
  const items = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((key, i) => ({
    key,
    total: i * 10,
  }));
  const spec = ANALYSES.expenseByWeekday.toSpec({ items });
  assert.deepStrictEqual(
    spec.categories,
    items.map((i) => i.key),
  );
  assert.strictEqual(spec.series[0].values[6], 60);
});

test('patrimônio usa os saldos já carregados, sem chamar a API', () => {
  const state = {
    balances: {
      items: [
        { accountId: 'a1', balance: 150000 },
        { accountId: 'a2', balance: -2000 },
      ],
    },
  };
  const items = ANALYSES.netWorth.local(state);
  assert.strictEqual(items.length, 2);
  const spec = ANALYSES.netWorth.toSpec(items, names);
  assert.strictEqual(spec.categories[0], 'Nubank');
  assert.deepStrictEqual(ANALYSES.netWorth.local({}), []);
});
