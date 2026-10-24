const { test } = require('node:test');
const assert = require('node:assert');
const { estimateYield, project } = require('../public/js/projection.js');

const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) <= 1, `${actual} deveria ser ~${expected}`);

test('rendimento por dia, semana e mês de R$ 10.000 a 12% ao ano', () => {
  const result = estimateYield(1000000, 12);
  near(result.daily, 311);
  near(result.weekly, 2176);
  near(result.monthly, 9489);
});

test('sem juros, não há rendimento', () => {
  assert.deepStrictEqual(estimateYield(1000000, 0), { daily: 0, weekly: 0, monthly: 0 });
});

test('R$ 1.000 a 12% ao ano rendem R$ 1.120 em um ano', () => {
  const [year1] = project({ initialCents: 100000, annualPercent: 12, years: 1 });
  assert.strictEqual(year1.balanceCents, 112000);
  assert.strictEqual(year1.interestCents, 12000);
});

test('sem juros, o saldo é o valor inicial mais os aportes', () => {
  const rows = project({
    initialCents: 100000,
    monthlyContributionCents: 10000,
    annualPercent: 0,
    years: 2,
  });
  assert.strictEqual(rows[1].balanceCents, 340000);
  assert.strictEqual(rows[1].investedCents, 340000);
  assert.strictEqual(rows[1].interestCents, 0);
});

test('projeta até 100 anos, ano a ano, com juros crescentes', () => {
  const rows = project({
    initialCents: 100000,
    monthlyContributionCents: 20000,
    annualPercent: 10,
    years: 100,
  });
  assert.strictEqual(rows.length, 100);
  assert.strictEqual(rows[99].year, 100);
  assert.ok(rows[99].balanceCents > rows[99].investedCents);
  assert.ok(rows[99].interestCents > rows[49].interestCents);
});

test('recusa prazos fora de 1 a 100 anos e valores inválidos', () => {
  for (const years of [0, 101, 1.5, undefined]) {
    assert.throws(() => project({ annualPercent: 10, years }), RangeError);
  }
  assert.throws(() => project({ initialCents: -1, years: 1 }), RangeError);
  assert.throws(() => project({ annualPercent: NaN, years: 1 }), RangeError);
});
