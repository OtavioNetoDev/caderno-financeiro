const { test } = require('node:test');
const assert = require('node:assert');
const { buildInvoice } = require('../src/services/cardService');

const charges = [
  {
    _id: 'a',
    description: 'Óculos',
    amount: 30000,
    installments: 1,
    purchaseDate: new Date('2026-09-09T15:00:00Z'),
  },
  {
    _id: 'b',
    description: 'Mercado',
    amount: 5000,
    installments: 1,
    purchaseDate: new Date('2026-10-03T15:00:00Z'),
  },
  {
    _id: 'c',
    description: 'Tênis',
    amount: 30000,
    installments: 3,
    purchaseDate: new Date('2026-09-09T15:00:00Z'),
  },
];

test('cada item da fatura de outubro explica de qual mês veio', () => {
  const invoice = buildInvoice(charges, 5, '2026-10', 10);
  const notes = Object.fromEntries(invoice.items.map((item) => [item.description, item.note]));
  assert.strictEqual(
    notes['Óculos'],
    'Comprado em setembro (09/09), mas só paga em outubro (vence 10/10). Conta como gasto de outubro.',
  );
  assert.strictEqual(
    notes['Mercado'],
    'Comprado em outubro (03/10) e pago em outubro (vence 10/10). Conta como gasto de outubro.',
  );
  assert.ok(notes['Tênis'].startsWith('Parcela 1 de 3 da compra de 09/09 (setembro).'));
});

test('parcela seguinte aparece na fatura do mês seguinte com a observação dela', () => {
  const invoice = buildInvoice(charges, 5, '2026-11', 10);
  assert.strictEqual(invoice.items.length, 1);
  assert.ok(invoice.items[0].note.startsWith('Parcela 2 de 3'));
  assert.ok(invoice.items[0].note.endsWith('Conta como gasto de novembro.'));
});

test('sem o dia de vencimento a observação fica vazia e o total não muda', () => {
  const invoice = buildInvoice(charges, 5, '2026-10');
  assert.ok(invoice.items.every((item) => item.note === ''));
  assert.strictEqual(invoice.total, 30000 + 5000 + 10000);
});
