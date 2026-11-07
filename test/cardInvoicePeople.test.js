const { test } = require('node:test');
const assert = require('node:assert');
const { buildInvoice } = require('../src/services/cardService');

const charge = (extra) => ({
  installments: 1,
  purchaseDate: new Date('2026-10-03T15:00:00Z'),
  ...extra,
});

test('a fatura separa quanto é de cada pessoa, da maior para a menor', () => {
  const charges = [
    charge({ _id: 'a', description: 'Mercado', amount: 5000 }),
    charge({ _id: 'b', description: 'Remédio', amount: 12000, personName: 'Mãe' }),
    charge({ _id: 'c', description: 'Lanche', amount: 3000, personName: 'Mãe' }),
    charge({ _id: 'd', description: 'Jogo', amount: 8000, personName: 'Sobrinho' }),
  ];
  const invoice = buildInvoice(charges, 5, '2026-10', 10);
  assert.deepStrictEqual(invoice.byPerson, [
    { personName: 'Mãe', total: 15000 },
    { personName: 'Sobrinho', total: 8000 },
    { personName: '', total: 5000 },
  ]);
  assert.strictEqual(invoice.total, 28000);
});

test('sem ninguém além de mim, só aparece o meu total', () => {
  const invoice = buildInvoice(
    [charge({ _id: 'a', description: 'Mercado', amount: 5000 })],
    5,
    '2026-10',
    10,
  );
  assert.deepStrictEqual(invoice.byPerson, [{ personName: '', total: 5000 }]);
});

test('fatura vazia devolve lista vazia', () => {
  assert.deepStrictEqual(buildInvoice([], 5, '2026-10', 10).byPerson, []);
});

test('a soma por pessoa bate com o total da fatura', () => {
  const charges = [
    charge({ _id: 'a', description: 'A', amount: 3333, installments: 3, personName: 'Mãe' }),
    charge({ _id: 'b', description: 'B', amount: 100 }),
  ];
  const invoice = buildInvoice(charges, 5, '2026-10', 10);
  const sum = invoice.byPerson.reduce((acc, person) => acc + person.total, 0);
  assert.strictEqual(sum, invoice.total);
});
