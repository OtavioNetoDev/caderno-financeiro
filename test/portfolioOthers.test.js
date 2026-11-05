const { test } = require('node:test');
const assert = require('node:assert');
const { portfolio } = require('../src/services/portfolioService');

const now = new Date('2026-11-02T12:00:00Z');
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
const entries = (amount) => [
  { _id: 'e' + amount, kind: 'contribution', amount, date: daysAgo(365) },
];

const investments = [
  { _id: 'a', name: 'Meu CDB', type: 'cdb', annualRate: 10, entries: entries(10000) },
  {
    _id: 'b',
    name: 'CDB do sobrinho',
    type: 'cdb',
    annualRate: 10,
    personName: 'Sobrinho',
    entries: entries(20000),
  },
  {
    _id: 'c',
    name: 'Tesouro da mãe',
    type: 'treasury',
    personName: 'Mãe',
    entries: entries(50000),
  },
  {
    _id: 'd',
    name: 'Outro do sobrinho',
    type: 'cdb',
    annualRate: 10,
    personName: ' sobrinho ',
    entries: entries(5000),
  },
  {
    _id: 'e',
    name: 'Antigo da mãe',
    type: 'cdb',
    personName: 'Mãe',
    archived: true,
    entries: entries(99999),
  },
];

test('os investimentos de outras pessoas não entram no total nem nos grupos', () => {
  const result = portfolio(investments, { cdi: 10, now });
  assert.strictEqual(result.total.applied, 10000);
  assert.deepStrictEqual(
    result.groups.flatMap((group) => group.items.map((item) => item.name)),
    ['Meu CDB'],
  );
  assert.ok(!result.history.some((entry) => entry.name !== 'Meu CDB'));
});

test('cada pessoa tem o seu total, ordenado pelo valor atual', () => {
  const result = portfolio(investments, { cdi: 10, now });
  assert.deepStrictEqual(
    result.others.map((person) => [person.personName, person.applied, person.items.length]),
    [
      ['Mãe', 50000, 1],
      ['Sobrinho', 25000, 2],
    ],
  );
});

test('o valor atual das outras pessoas usa a mesma estimativa da minha carteira', () => {
  const result = portfolio(investments, { cdi: 10, now });
  const sobrinho = result.others.find((person) => person.personName === 'Sobrinho');
  assert.strictEqual(sobrinho.value, 27500);
  assert.strictEqual(sobrinho.gain, 2500);
  assert.deepStrictEqual(
    sobrinho.items.map((item) => item.name),
    ['CDB do sobrinho', 'Outro do sobrinho'],
  );
});

test('sem investimentos de outras pessoas a lista vem vazia', () => {
  const result = portfolio([investments[0]], { cdi: 10, now });
  assert.deepStrictEqual(result.others, []);
});
