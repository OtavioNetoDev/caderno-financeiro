const { test } = require('node:test');
const assert = require('node:assert');
const { portfolio, tickerOf } = require('../src/services/portfolioService');
const { parseChart } = require('../src/services/quotesService');

const now = new Date('2026-11-02T12:00:00Z');

const mxrf = () => ({
  _id: 'm1',
  name: 'mxrf11',
  type: 'fii',
  monthlyIncomePerShare: 10,
  entries: [
    { _id: 'e1', kind: 'contribution', amount: 2950, quantity: 3, date: '2026-05-06T12:00:00Z' },
    { _id: 'e2', kind: 'contribution', amount: 9804, quantity: 10, date: '2026-07-08T12:00:00Z' },
  ],
});

test('tickerOf usa o ticker informado, o nome ou um apelido conhecido', () => {
  assert.strictEqual(tickerOf({ name: 'mxrf11' }), 'MXRF11');
  assert.strictEqual(tickerOf({ name: 'vale' }), 'VALE3');
  assert.strictEqual(tickerOf({ name: 'minha ação', ticker: 'petr4' }), 'PETR4');
  assert.strictEqual(tickerOf({ name: 'tesouro selic' }), '');
});

test('com cotação: valor de mercado, na alta e proventos por mês', () => {
  const quotes = { MXRF11: { price: 1000, previousClose: 990 } };
  const result = portfolio([mxrf()], { now, quotes });
  const item = result.groups[0].items[0];
  assert.strictEqual(item.source, 'market');
  assert.strictEqual(item.value, 13000);
  assert.strictEqual(item.gain, 13000 - 12754);
  assert.ok(item.vsAverage > 0);
  assert.strictEqual(item.dayChange, 1.01);
  assert.strictEqual(item.monthlyIncome, 130);
  assert.strictEqual(result.total.monthly, 130);
});

test('abaixo do preço médio aparece negativo', () => {
  const quotes = { MXRF11: { price: 900, previousClose: 910 } };
  const item = portfolio([mxrf()], { now, quotes }).groups[0].items[0];
  assert.ok(item.vsAverage < 0);
  assert.ok(item.dayChange < 0);
});

test('sem cotação volta ao preço de custo e mantém os proventos', () => {
  const item = portfolio([mxrf()], { now, quotes: {} }).groups[0].items[0];
  assert.strictEqual(item.source, 'cost');
  assert.strictEqual(item.price, null);
  assert.strictEqual(item.value, 12754);
  assert.strictEqual(item.monthlyIncome, 130);
});

test('parseChart lê preço e fechamento anterior em centavos', () => {
  const json = {
    chart: {
      result: [
        {
          meta: { regularMarketPrice: 9.99, chartPreviousClose: 9.5 },
          indicators: { quote: [{ close: [9.7, 9.8, null, 9.99] }] },
        },
      ],
    },
  };
  assert.deepStrictEqual(parseChart(json), { price: 999, previousClose: 980 });
  assert.strictEqual(parseChart({}), null);
});
