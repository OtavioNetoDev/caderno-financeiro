const { test } = require('node:test');
const assert = require('node:assert');
const { computeBalance, applyEntry, summarize } = require('../src/services/debtService');

const newDebt = (originalAmount = 100000) => ({
  originalAmount,
  balance: originalAmount,
  status: 'open',
  entries: [],
});

test('calcula o saldo a partir das movimentações', () => {
  const entries = [
    { kind: 'payment', amount: 30000 },
    { kind: 'increase', amount: 5000 },
  ];
  assert.strictEqual(computeBalance(100000, entries), 75000);
});

test('pagamento reduz o saldo', () => {
  const debt = newDebt();
  assert.strictEqual(applyEntry(debt, { kind: 'payment', amount: 40000 }), null);
  assert.strictEqual(debt.balance, 60000);
  assert.strictEqual(debt.status, 'open');
});

test('quita ao chegar a zero e reabre com um aumento', () => {
  const debt = newDebt(50000);
  applyEntry(debt, { kind: 'payment', amount: 50000 });
  assert.strictEqual(debt.balance, 0);
  assert.strictEqual(debt.status, 'settled');
  applyEntry(debt, { kind: 'increase', amount: 100000 });
  assert.strictEqual(debt.balance, 100000);
  assert.strictEqual(debt.status, 'open');
});

test('recusa pagamento maior que o saldo, sem alterar a dívida', () => {
  const debt = newDebt(10000);
  assert.ok(applyEntry(debt, { kind: 'payment', amount: 10001 }));
  assert.strictEqual(debt.balance, 10000);
  assert.strictEqual(debt.entries.length, 0);
});

test('recusa valores inválidos', () => {
  for (const amount of [12.5, 0, -1, '10']) {
    assert.ok(applyEntry(newDebt(), { kind: 'payment', amount }));
  }
});

test('resume só as dívidas abertas', () => {
  const summary = summarize([
    { direction: 'receivable', balance: 90000, status: 'open' },
    { direction: 'receivable', balance: 0, status: 'settled' },
    { direction: 'payable', balance: 30000, status: 'open' },
  ]);
  assert.deepStrictEqual(summary, { receivable: 90000, payable: 30000, net: 60000, openCount: 2 });
});
