const { test } = require('node:test');
const assert = require('node:assert');
const { position } = require('../src/services/investmentService');

const now = new Date('2026-11-02T15:00:00Z');
const day = (text) => new Date(text + 'T12:00:00-03:00');

test('soma as cotas compradas e desconta as vendidas', () => {
  const result = position(
    [
      { kind: 'contribution', amount: 10000, quantity: 10, date: day('2026-05-10') },
      { kind: 'contribution', amount: 5000, quantity: 5, date: day('2026-06-10') },
      { kind: 'redemption', amount: 2000, quantity: 2, date: day('2026-07-10') },
    ],
    now,
  );
  assert.strictEqual(result.quantity, 13);
});

test('preço médio considera só os aportes que informaram cotas', () => {
  const result = position(
    [
      { kind: 'contribution', amount: 10000, quantity: 10, date: day('2026-05-10') },
      { kind: 'contribution', amount: 6000, quantity: 5, date: day('2026-06-10') },
      { kind: 'contribution', amount: 99999, date: day('2026-07-10') },
    ],
    now,
  );
  assert.strictEqual(result.averagePrice, Math.round(16000 / 15));
});

test('sem cotas informadas não há preço médio nem provento por cota', () => {
  const result = position([{ kind: 'contribution', amount: 10000, date: day('2026-05-10') }], now);
  assert.strictEqual(result.quantity, 0);
  assert.strictEqual(result.averagePrice, null);
  assert.strictEqual(result.incomePerShare12m, null);
});

test('proventos dos últimos 12 meses ignoram os mais antigos', () => {
  const result = position(
    [
      { kind: 'contribution', amount: 100000, quantity: 100, date: day('2025-01-10') },
      { kind: 'income', amount: 900, date: day('2025-09-10') },
      { kind: 'income', amount: 1000, date: day('2026-02-10') },
      { kind: 'income', amount: 1100, date: day('2026-10-10') },
    ],
    now,
  );
  assert.strictEqual(result.income, 3000);
  assert.strictEqual(result.income12m, 2100);
  assert.strictEqual(result.incomePerShare12m, 21);
});

test('cotas fracionadas ficam com até 6 casas', () => {
  const result = position(
    [{ kind: 'contribution', amount: 5000, quantity: 0.1 + 0.2, date: day('2026-05-10') }],
    now,
  );
  assert.strictEqual(result.quantity, 0.3);
});
