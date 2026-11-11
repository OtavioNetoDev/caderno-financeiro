const { test } = require('node:test');
const assert = require('node:assert');
const { incomeReport } = require('../src/services/investmentService');

const day = (text) => new Date(text + 'T12:00:00-03:00');
const entries = [
  { _id: 'c', kind: 'contribution', amount: 100000, date: day('2026-08-05') },
  { _id: 'i', kind: 'income', amount: 1000, date: day('2026-10-14') },
];
const investments = [
  { _id: 'a', name: 'MXRF11', type: 'fii', entries },
  { _id: 'b', name: 'Vale', type: 'stock', entries },
  { _id: 'c', name: 'Poupança', type: 'savings', entries },
  { _id: 'd', name: 'CDB', type: 'cdb', entries },
  { _id: 'e', name: 'Fundo', type: 'fund', entries },
];
const names = (report) => report.returns.map((item) => item.name).sort();

test('market mostra só ações e fundos imobiliários', () => {
  const report = incomeReport(investments, { group: 'market' });
  assert.deepStrictEqual(names(report), ['MXRF11', 'Vale']);
  assert.strictEqual(report.total, 2000);
  assert.strictEqual(report.count, 2);
});

test('fixed mostra renda fixa, poupança e fundos', () => {
  const report = incomeReport(investments, { group: 'fixed' });
  assert.deepStrictEqual(names(report), ['CDB', 'Fundo', 'Poupança']);
  assert.strictEqual(report.total, 3000);
});

test('sem grupo continua mostrando tudo', () => {
  const report = incomeReport(investments);
  assert.strictEqual(report.count, 5);
  assert.strictEqual(report.total, 5000);
});

test('os totais por mês também respeitam o grupo', () => {
  const report = incomeReport(investments, { group: 'market' });
  assert.deepStrictEqual(report.byMonth, [{ month: '2026-10', total: 2000 }]);
});
