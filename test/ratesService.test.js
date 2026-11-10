const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { getCdi, resetCache } = require('../src/services/ratesService');

const realFetch = globalThis.fetch;
const realNow = Date.now;
let calls = 0;

const answer = (valor) => async () => {
  calls += 1;
  return { json: async () => [{ data: '03/11/2026', valor }] };
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

test('busca o CDI uma vez e reaproveita nas próximas', async () => {
  globalThis.fetch = answer('14,90');
  assert.deepStrictEqual(await getCdi(), { annual: 14.9, date: '03/11/2026' });
  assert.strictEqual((await getCdi()).annual, 14.9);
  assert.strictEqual(calls, 1);
});

test('depois de uma falha não tenta de novo na hora', async () => {
  globalThis.fetch = async () => {
    calls += 1;
    throw new Error('sem internet');
  };
  assert.strictEqual((await getCdi()).annual, null);
  assert.strictEqual((await getCdi()).annual, null);
  assert.strictEqual(calls, 1);
});

test('valor velho é devolvido na hora e atualizado em segundo plano', async () => {
  globalThis.fetch = answer('14,90');
  await getCdi();
  const start = Date.now();
  Date.now = () => start + 7 * 60 * 60 * 1000;
  globalThis.fetch = answer('15,00');
  assert.strictEqual((await getCdi()).annual, 14.9);
  await wait(10);
  assert.strictEqual((await getCdi()).annual, 15);
  assert.strictEqual(calls, 2);
});

test('com prazo curto não trava a resposta e guarda o valor para depois', async () => {
  globalThis.fetch = async () => {
    calls += 1;
    await wait(60);
    return { json: async () => [{ data: '03/11/2026', valor: '14,90' }] };
  };
  const begun = Date.now();
  assert.strictEqual((await getCdi({ waitMs: 10 })).annual, null);
  assert.ok(Date.now() - begun < 50);
  await wait(100);
  assert.strictEqual((await getCdi()).annual, 14.9);
  assert.strictEqual(calls, 1);
});
