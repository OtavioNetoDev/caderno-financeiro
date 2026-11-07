const { test } = require('node:test');
const assert = require('node:assert');
const { spendingForMonth } = require('../src/services/cardService');

const cards = [
  { _id: 'k1', name: 'Nubank', closingDay: 5, dueDay: 10 },
  { _id: 'k2', name: 'Inter', closingDay: 20, dueDay: 28 },
  { _id: 'k3', name: 'Sem uso', closingDay: 1, dueDay: 8 },
];
const charge = (extra) => ({
  cardId: 'k1',
  installments: 1,
  purchaseDate: '2026-10-03T15:00:00Z',
  categoryId: null,
  ...extra,
});

test('devolve uma fatura por cartão com o total e a descrição do período', () => {
  const charges = [
    charge({ amount: 5000 }),
    charge({ amount: 2500, purchaseDate: '2026-09-09T15:00:00Z' }),
    charge({ cardId: 'k2', amount: 9000, purchaseDate: '2026-10-10T15:00:00Z' }),
  ];
  const result = spendingForMonth(cards, charges, '2026-10');
  assert.strictEqual(result.total, 16500);
  assert.deepStrictEqual(
    result.invoices.map((invoice) => [invoice.name, invoice.total, invoice.count]),
    [
      ['Inter', 9000, 1],
      ['Nubank', 7500, 2],
    ],
  );
  const nubank = result.invoices.find((invoice) => invoice.name === 'Nubank');
  assert.strictEqual(
    nubank.description,
    'Fatura de outubro: compras de 06/09 a 05/10, vence em 10/10. Todas contam como gasto de outubro.',
  );
});

test('cartão sem compras no mês não aparece', () => {
  const result = spendingForMonth(cards, [charge({ amount: 1000 })], '2026-10');
  assert.ok(!result.invoices.some((invoice) => invoice.name === 'Sem uso'));
});

test('parcelas contam em cada mês e mês sem compras devolve lista vazia', () => {
  const charges = [
    charge({ amount: 30000, installments: 3, purchaseDate: '2026-09-09T15:00:00Z' }),
  ];
  assert.strictEqual(spendingForMonth(cards, charges, '2026-11').invoices[0].total, 10000);
  assert.deepStrictEqual(spendingForMonth(cards, charges, '2027-03').invoices, []);
});

test('o total e as categorias continuam iguais', () => {
  const result = spendingForMonth(cards, [charge({ amount: 4000, categoryId: 'c1' })], '2026-10');
  assert.strictEqual(result.total, 4000);
  assert.deepStrictEqual(result.byCategory, [{ categoryId: 'c1', total: 4000 }]);
});
