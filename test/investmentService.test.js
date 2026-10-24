const { test } = require('node:test');
const assert = require('node:assert');
const { position, applyEntry, summarize } = require('../src/services/investmentService');

test('resgatar mais do que foi aplicado gera ganho recebido', () => {
  const result = position([
    { kind: 'contribution', amount: 10000 },
    { kind: 'redemption', amount: 10610 },
  ]);
  assert.strictEqual(result.balance, 0);
  assert.strictEqual(result.received, 610);
});

test('resgate parcial reduz o saldo aplicado', () => {
  const result = position([
    { kind: 'contribution', amount: 100000 },
    { kind: 'redemption', amount: 40000 },
  ]);
  assert.strictEqual(result.balance, 60000);
  assert.strictEqual(result.received, 0);
});

test('proventos entram no total recebido sem alterar o saldo', () => {
  const result = position([
    { kind: 'contribution', amount: 50000 },
    { kind: 'income', amount: 130 },
    { kind: 'income', amount: 880 },
  ]);
  assert.strictEqual(result.balance, 50000);
  assert.strictEqual(result.received, 1010);
});

test('recusa tipo e valores inválidos', () => {
  const investment = { entries: [] };
  assert.ok(applyEntry(investment, { kind: 'bonus', amount: 100 }));
  for (const amount of [0, -5, 12.5, '10']) {
    assert.ok(applyEntry(investment, { kind: 'contribution', amount }));
  }
  assert.strictEqual(investment.entries.length, 0);
  assert.strictEqual(applyEntry(investment, { kind: 'contribution', amount: 100 }), null);
  assert.strictEqual(investment.entries.length, 1);
});

test('resume a carteira ignorando investimentos arquivados', () => {
  const summary = summarize([
    { annualRate: 12, archived: false, entries: [{ kind: 'contribution', amount: 1000000 }] },
    {
      annualRate: 0,
      archived: false,
      entries: [
        { kind: 'contribution', amount: 500000 },
        { kind: 'income', amount: 700 },
      ],
    },
    { annualRate: 20, archived: true, entries: [{ kind: 'contribution', amount: 999999 }] },
  ]);
  assert.strictEqual(summary.count, 2);
  assert.strictEqual(summary.balance, 1500000);
  assert.strictEqual(summary.received, 700);
  assert.ok(Math.abs(summary.yields.monthly - 9489) <= 1);
});
