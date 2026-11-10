const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { getQuote, getQuotes, resetCache } = require('../src/services/quotesService');

const realFetch = globalThis.fetch;
const realNow = Date.now;
let calls = 0;

const chart = (price) => ({
  chart: {
    result: [
      {
        meta: { regularMarketPrice: price, chartPreviousClose: price - 0.1 },
        indicators: { quote: [{ close: [price - 0.1, price] }] },
      },
    ],
  },
});
const answer = (price) => async () => {
  calls += 1;
  return { json: async () => chart(price) };
};
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  calls = 0;
  resetCache();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  Date.now = realNow;
});

test('busca a cotação uma vez e reaproveita nas próximas', async () => {
  globalThis.fetch = answer(10.5);
  assert.deepStrictEqual(await getQuote('mxrf11'), { price: 1050, previousClose: 1040 });
  assert.strictEqual((await getQuote('MXRF11')).price, 1050);
  assert.strictEqual(calls, 1);
});

test('depois de uma falha não tenta de novo na hora', async () => {
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('sem internet');
  };
  assert.strictEqual(await getQuote('MXRF11'), null);
  assert.strictEqual(await getQuote('MXRF11'), null);
  assert.strictEqual(calls, 1);
});

test('cotação velha é devolvida na hora e atualizada em segundo plano', async () => {
  globalThis.fetch = answer(10.5);
  await getQuote('MXRF11');
  const start = Date.now();
  Date.now = () => start + 16 * 60 * 1000;
  globalThis.fetch = answer(11);
  assert.strictEqual((await getQuote('MXRF11')).price, 1050);
  await wait(10);
  assert.strictEqual((await getQuote('MXRF11')).price, 1100);
  assert.strictEqual(calls, 2);
});

test('com prazo curto segue sem a cotação e guarda para depois', async () => {
  globalThis.fetch = async () => {
    calls += 1;
    await wait(60);
    return { json: async () => chart(10.5) };
  };
  const begun = Date.now();
  assert.strictEqual(await getQuote('MXRF11', { waitMs: 10 }), null);
  assert.ok(Date.now() - begun < 50);
  await wait(100);
  assert.strictEqual((await getQuote('MXRF11')).price, 1050);
  assert.strictEqual(calls, 1);
});

test('várias buscas ao mesmo tempo viram uma só', async () => {
  globalThis.fetch = async () => {
    calls += 1;
    await wait(20);
    return { json: async () => chart(10.5) };
  };
  await Promise.all([getQuote('MXRF11'), getQuote('MXRF11'), getQuote('MXRF11')]);
  assert.strictEqual(calls, 1);
});

test('getQuotes devolve só os códigos que deram certo', async () => {
  globalThis.fetch = async (url) => {
    if (url.includes('FALHA3')) {
      throw new Error('fora do ar');
    }
    return { json: async () => chart(10.5) };
  };
  const quotes = await getQuotes(['MXRF11', 'FALHA3', 'MXRF11']);
  assert.deepStrictEqual(Object.keys(quotes), ['MXRF11']);
});
