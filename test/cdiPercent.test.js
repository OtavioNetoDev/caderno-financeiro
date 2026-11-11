const { test } = require('node:test');
const assert = require('node:assert');
const { portfolio } = require('../src/services/portfolioService');

const now = new Date('2026-11-02T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const entries = [{ _id: 'e1', kind: 'contribution', amount: 10000, date: daysAgo(365) }];

const first = (investment, cdi = 10) => {
  const result = portfolio([{ _id: 'a', name: 'Teste', entries, ...investment }], { cdi, now });
  return result.groups[0].items[0];
};

test('85% do CDI de 10% rende 8,5% ao ano', () => {
  const item = first({ type: 'savings', cdiPercent: 85 });
  assert.strictEqual(item.source, 'cdipct');
  assert.strictEqual(item.rate, 8.5);
  assert.strictEqual(item.value, 10850);
});

test('a taxa anual informada vale mais que o percentual do CDI', () => {
  const item = first({ type: 'cdb', annualRate: 12, cdiPercent: 85 });
  assert.strictEqual(item.source, 'rate');
  assert.strictEqual(item.rate, 12);
});

test('o ganho por dia útil vale mais que tudo', () => {
  const item = first({ type: 'treasury', annualRate: 12, cdiPercent: 85, dailyGain: 10 });
  assert.strictEqual(item.source, 'daily');
});

test('sem CDI disponível estima pelo custo', () => {
  const item = first({ type: 'savings', cdiPercent: 85 }, null);
  assert.strictEqual(item.source, 'cost');
  assert.strictEqual(item.value, 10000);
});

test('sem percentual continua valendo 100% do CDI', () => {
  const item = first({ type: 'cdb' });
  assert.strictEqual(item.source, 'cdi');
  assert.strictEqual(item.rate, 10);
});

test('o item devolve a taxa, o ganho por dia e o percentual para a tela editar', () => {
  const item = first({ type: 'cdb', annualRate: 11.5, dailyGain: 25, cdiPercent: 90 });
  assert.strictEqual(item.annualRate, 11.5);
  assert.strictEqual(item.dailyGain, 25);
  assert.strictEqual(item.cdiPercent, 90);
});
