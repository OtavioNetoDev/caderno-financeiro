const { test } = require('node:test');
const assert = require('node:assert');
const { incomeReport } = require('../src/services/investmentService');

const day = (text) => new Date(text + 'T12:00:00-03:00');
const october = {
  from: new Date('2026-10-01T03:00:00.000Z'),
  to: new Date('2026-11-01T02:59:59.999Z'),
};

const investments = [
  {
    _id: 'a',
    name: 'MXRF11',
    type: 'fii',
    entries: [
      { _id: 'e1', kind: 'contribution', amount: 100000, date: day('2026-08-05') },
      { _id: 'e2', kind: 'contribution', amount: 100000, date: day('2026-12-05') },
      { _id: 'e3', kind: 'income', amount: 1000, date: day('2026-10-14') },
    ],
  },
  {
    _id: 'b',
    name: 'Tesouro',
    type: 'treasury',
    entries: [{ _id: 'e4', kind: 'contribution', amount: 50000, date: day('2026-09-01') }],
  },
  {
    _id: 'c',
    name: 'FII da Mãe',
    type: 'fii',
    personName: 'Mãe',
    entries: [
      { _id: 'e5', kind: 'contribution', amount: 300000, date: day('2026-01-05') },
      { _id: 'e6', kind: 'income', amount: 2500, date: day('2026-10-20') },
    ],
  },
  {
    _id: 'd',
    name: 'Antigo',
    type: 'fii',
    archived: true,
    entries: [{ _id: 'e7', kind: 'contribution', amount: 10000, date: day('2026-01-05') }],
  },
];

test('retorno é o provento do período sobre o que estava investido no fim dele', () => {
  const report = incomeReport(investments, october);
  const mxrf = report.returns.find((item) => item.name === 'MXRF11');
  // O aporte de dezembro ainda não existia em outubro.
  assert.deepStrictEqual(mxrf, {
    investmentId: 'a',
    name: 'MXRF11',
    invested: 100000,
    received: 1000,
    percent: 1,
  });
});

test('investimento sem provento no período aparece com retorno zero', () => {
  const report = incomeReport(investments, october);
  const treasury = report.returns.find((item) => item.name === 'Tesouro');
  assert.strictEqual(treasury.received, 0);
  assert.strictEqual(treasury.percent, 0);
});

test('arquivados ficam fora do retorno', () => {
  const report = incomeReport(investments, october);
  assert.ok(!report.returns.some((item) => item.name === 'Antigo'));
});

test('proventos de outras pessoas não entram no total nem na lista', () => {
  const report = incomeReport(investments, october);
  assert.strictEqual(report.total, 1000);
  assert.strictEqual(report.count, 1);
  assert.ok(!report.items.some((item) => item.investmentName === 'FII da Mãe'));
  assert.ok(!report.returns.some((item) => item.name === 'FII da Mãe'));
});

test('o que outras pessoas receberam aparece separado, por pessoa', () => {
  const report = incomeReport(investments, october);
  assert.deepStrictEqual(report.others, [{ personName: 'Mãe', total: 2500, count: 1 }]);
});

test('ordena o retorno pelo valor investido', () => {
  const report = incomeReport(investments, october);
  assert.deepStrictEqual(
    report.returns.map((item) => item.name),
    ['MXRF11', 'Tesouro'],
  );
});
