const { test } = require('node:test');
const assert = require('node:assert');
const { statusOf } = require('../src/services/budgetService');

test('abaixo de 80% está dentro da meta', () => {
  assert.deepStrictEqual(statusOf(10000, 0), { percent: 0, remaining: 10000, level: 'ok' });
  assert.deepStrictEqual(statusOf(10000, 7999), { percent: 79, remaining: 2001, level: 'ok' });
});

test('a partir de 80% é atenção', () => {
  assert.deepStrictEqual(statusOf(10000, 8000), { percent: 80, remaining: 2000, level: 'warning' });
});

test('ao atingir 100% a meta está estourada, com saldo negativo se passar', () => {
  assert.strictEqual(statusOf(10000, 10000).level, 'exceeded');
  assert.deepStrictEqual(statusOf(10000, 12550), {
    percent: 125,
    remaining: -2550,
    level: 'exceeded',
  });
});
