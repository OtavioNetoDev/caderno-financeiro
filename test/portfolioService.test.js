const { test } = require('node:test');
const assert = require('node:assert');
const { valuation, portfolio } = require('../src/services/portfolioService');

const DAY_MS = 24 * 60 * 60 * 1000;
const now = new Date('2026-11-02T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * DAY_MS);

test('renda fixa sem taxa rende pelo CDI desde a data do aporte', () => {
  const data = {
    type: 'treasury',
    entries: [{ kind: 'contribution', amount: 10000, date: daysAgo(365) }],
  };
  const result = valuation(data, { cdi: 10, now });
  assert.strictEqual(result.value, 11000);
  assert.strictEqual(result.gain, 1000);
  assert.strictEqual(result.source, 'cdi');
});

test('ação sem taxa fica a preço de custo', () => {
  const data = {
    type: 'stock',
    entries: [{ kind: 'contribution', amount: 5000, date: daysAgo(100) }],
  };
  const result = valuation(data, { cdi: 10, now });
  assert.strictEqual(result.value, 5000);
  assert.strictEqual(result.source, 'cost');
});

test('valor real informado vira o ponto de partida', () => {
  const data = {
    type: 'stock',
    currentValue: 8118,
    currentValueDate: new Date('2026-05-06T12:00:00Z'),
    entries: [{ kind: 'contribution', amount: 5291, date: new Date('2025-08-01T12:00:00Z') }],
  };
  const result = valuation(data, { cdi: null, now });
  assert.strictEqual(result.value, 8118);
  assert.strictEqual(result.gain, 2827);
  assert.strictEqual(result.source, 'manual');
});

test('portfolio agrupa por tipo, ignora outras pessoas e ordena o histórico', () => {
  const investments = [
    {
      _id: 'a',
      name: 'tesouro selic',
      type: 'treasury',
      entries: [{ _id: 'e1', kind: 'contribution', amount: 10000, date: daysAgo(365) }],
    },
    {
      _id: 'b',
      name: 'vale',
      type: 'stock',
      entries: [
        { _id: 'e2', kind: 'contribution', amount: 5000, quantity: 1, date: daysAgo(300) },
        { _id: 'e3', kind: 'income', amount: 100, date: daysAgo(10) },
      ],
    },
    {
      _id: 'c',
      name: 'cdb da mãe',
      type: 'cdb',
      personName: 'mãe',
      entries: [{ _id: 'e4', kind: 'contribution', amount: 999, date: daysAgo(5) }],
    },
  ];
  const result = portfolio(investments, { cdi: 10, now });
  assert.strictEqual(result.total.applied, 15000);
  assert.strictEqual(result.total.value, 16000);
  assert.strictEqual(result.total.gain, 1100);
  assert.deepStrictEqual(
    result.groups.map((group) => group.key),
    ['treasury', 'stock'],
  );
  assert.ok(Math.abs(result.groups[0].percent - 68.8) < 0.11);
  assert.strictEqual(result.history.length, 3);
  assert.strictEqual(result.history[0].kind, 'income');
});
