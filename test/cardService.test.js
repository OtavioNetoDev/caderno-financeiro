const { test } = require('node:test');
const assert = require('node:assert');
const {
  addMonths,
  referenceMonth,
  dueMonth,
  splitInstallments,
  installmentsOf,
  buildInvoice,
} = require('../src/services/cardService');

test('soma e subtrai meses atravessando o ano', () => {
  assert.strictEqual(addMonths('2026-11', 2), '2027-01');
  assert.strictEqual(addMonths('2026-01', -1), '2025-12');
  assert.strictEqual(addMonths('2026-05', 0), '2026-05');
});

test('o dia de fechamento define o mês da fatura', () => {
  assert.strictEqual(referenceMonth('2026-10-05T15:00:00Z', 6), '2026-10');
  assert.strictEqual(referenceMonth('2026-10-06T15:00:00Z', 6), '2026-10');
  assert.strictEqual(referenceMonth('2026-10-07T15:00:00Z', 6), '2026-11');
  assert.strictEqual(referenceMonth('2026-12-20T15:00:00Z', 6), '2027-01');
});

test('o vencimento cai no mesmo mês ou no seguinte', () => {
  assert.strictEqual(dueMonth('2026-10', 6, 15), '2026-10');
  assert.strictEqual(dueMonth('2026-10', 25, 5), '2026-11');
});

test('divide em parcelas sem perder centavos', () => {
  assert.deepStrictEqual(splitInstallments(10000, 3), [3334, 3333, 3333]);
  assert.deepStrictEqual(splitInstallments(100, 1), [100]);
  assert.strictEqual(
    splitInstallments(99999, 7).reduce((a, b) => a + b, 0),
    99999,
  );
});

test('recusa valores e parcelas inválidos', () => {
  for (const [total, count] of [
    [0, 1],
    [100, 0],
    [100, 49],
    [12.5, 2],
    [100, 1.5],
  ]) {
    assert.throws(() => splitInstallments(total, count), RangeError);
  }
});

test('cada parcela cai em uma fatura diferente', () => {
  const parts = installmentsOf(
    { amount: 30000, installments: 3, purchaseDate: '2026-10-15T15:00:00Z' },
    10,
  );
  assert.deepStrictEqual(
    parts.map((part) => part.month),
    ['2026-11', '2026-12', '2027-01'],
  );
  assert.deepStrictEqual(
    parts.map((part) => part.amount),
    [10000, 10000, 10000],
  );
});

test('monta a fatura do mês com as parcelas certas', () => {
  const charges = [
    {
      _id: 'a',
      description: 'Óculos',
      amount: 30000,
      installments: 2,
      purchaseDate: '2026-10-02T15:00:00Z',
    },
    {
      _id: 'b',
      description: 'Mercado',
      amount: 20676,
      installments: 1,
      purchaseDate: '2026-10-20T15:00:00Z',
    },
  ];
  const october = buildInvoice(charges, 6, '2026-10');
  assert.strictEqual(october.total, 15000);
  assert.strictEqual(october.items.length, 1);
  assert.strictEqual(`${october.items[0].number}/${october.items[0].of}`, '1/2');

  const november = buildInvoice(charges, 6, '2026-11');
  assert.strictEqual(november.total, 35676);
  assert.deepStrictEqual(
    november.items.map((item) => item.description),
    ['Óculos', 'Mercado'],
  );
});
