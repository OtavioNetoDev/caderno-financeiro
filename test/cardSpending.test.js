const { test } = require('node:test');
const assert = require('node:assert');
const { spendingForMonth } = require('../src/services/cardService');

const cards = [{ _id: 'k1', closingDay: 6 }];
const charge = (extra) => ({
  cardId: 'k1',
  installments: 1,
  purchaseDate: '2026-10-03T15:00:00Z',
  categoryId: null,
  ...extra,
});

test('soma as compras da fatura do mês por categoria', () => {
  const charges = [
    charge({ amount: 5000, categoryId: 'c1' }),
    charge({ amount: 2500, categoryId: 'c1' }),
    charge({ amount: 1000 }),
  ];
  const result = spendingForMonth(cards, charges, '2026-10');
  assert.strictEqual(result.total, 8500);
  assert.deepStrictEqual(result.byCategory, [
    { categoryId: 'c1', total: 7500 },
    { categoryId: null, total: 1000 },
  ]);
});

test('compra depois do fechamento cai na fatura seguinte', () => {
  const charges = [charge({ amount: 4000, purchaseDate: '2026-10-07T15:00:00Z' })];
  assert.strictEqual(spendingForMonth(cards, charges, '2026-10').total, 0);
  assert.strictEqual(spendingForMonth(cards, charges, '2026-11').total, 4000);
});

test('parcelas entram uma em cada mês', () => {
  const charges = [charge({ amount: 10000, installments: 3, categoryId: 'c2' })];
  assert.strictEqual(spendingForMonth(cards, charges, '2026-10').total, 3334);
  assert.strictEqual(spendingForMonth(cards, charges, '2026-11').total, 3333);
  assert.strictEqual(spendingForMonth(cards, charges, '2026-12').total, 3333);
  assert.strictEqual(spendingForMonth(cards, charges, '2027-01').total, 0);
});

test('ignora compras de cartão que não está na lista', () => {
  const charges = [charge({ cardId: 'x9', amount: 999 })];
  assert.strictEqual(spendingForMonth(cards, charges, '2026-10').total, 0);
});
