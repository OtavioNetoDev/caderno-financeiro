const { test } = require('node:test');
const assert = require('node:assert');
const { fetchAllPages } = require('../public/js/paging.js');

// Simula a API: 450 itens, 200 por página.
function fakeApi(total, pageSize = 200) {
  const calls = [];
  const fetchPage = async (page) => {
    calls.push(page);
    const start = (page - 1) * pageSize;
    const items = Array.from(
      { length: Math.max(0, Math.min(pageSize, total - start)) },
      (_, i) => start + i,
    );
    return { items, total };
  };
  return { fetchPage, calls };
}

test('junta todas as páginas até completar o total', async () => {
  const api = fakeApi(450);
  const result = await fetchAllPages(api.fetchPage);
  assert.strictEqual(result.items.length, 450);
  assert.strictEqual(result.total, 450);
  assert.strictEqual(result.truncated, false);
  assert.deepStrictEqual(api.calls, [1, 2, 3]);
  assert.strictEqual(result.items[449], 449);
});

test('uma página só quando tudo cabe nela', async () => {
  const api = fakeApi(37);
  const result = await fetchAllPages(api.fetchPage);
  assert.strictEqual(result.items.length, 37);
  assert.deepStrictEqual(api.calls, [1]);
});

test('lista vazia não entra em laço', async () => {
  const api = fakeApi(0);
  const result = await fetchAllPages(api.fetchPage);
  assert.deepStrictEqual(result, { items: [], total: 0, truncated: false });
  assert.deepStrictEqual(api.calls, [1]);
});

test('respeita o limite de páginas e avisa que cortou', async () => {
  const api = fakeApi(1000);
  const result = await fetchAllPages(api.fetchPage, { maxPages: 2 });
  assert.strictEqual(result.items.length, 400);
  assert.strictEqual(result.total, 1000);
  assert.strictEqual(result.truncated, true);
  assert.deepStrictEqual(api.calls, [1, 2]);
});

test('para se a API devolver uma página vazia antes do total', async () => {
  const calls = [];
  const result = await fetchAllPages(async (page) => {
    calls.push(page);
    return page === 1 ? { items: [1, 2], total: 10 } : { items: [], total: 10 };
  });
  assert.strictEqual(result.items.length, 2);
  assert.strictEqual(result.truncated, true);
  assert.deepStrictEqual(calls, [1, 2]);
});
