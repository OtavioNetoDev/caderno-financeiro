const { test } = require('node:test');
const assert = require('node:assert');
const { parseBackup, classify, brokenReferences } = require('../src/services/restoreService');

const id = (n) => String(n).padStart(24, '0');
const backup = (extra = {}) => JSON.stringify({ version: 1, user: { email: 'a@b.com' }, ...extra });

test('lê um backup válido e devolve as listas e o dono', () => {
  const { collections, owner } = parseBackup(backup({ accounts: [{ _id: id(1) }] }));
  assert.strictEqual(collections.accounts.length, 1);
  assert.deepStrictEqual(collections.transactions, []);
  assert.strictEqual(owner, 'a@b.com');
});

test('recusa arquivo que não é backup', () => {
  assert.throws(() => parseBackup('isso não é json'), RangeError);
  assert.throws(() => parseBackup('[]'), RangeError);
  assert.throws(() => parseBackup(JSON.stringify({ version: 2 })), RangeError);
});

test('recusa listas inválidas e itens sem identificador', () => {
  assert.throws(() => parseBackup(backup({ accounts: {} })), /accounts/);
  assert.throws(() => parseBackup(backup({ notes: [{ title: 'x' }] })), /notes/);
  assert.throws(() => parseBackup(backup({ notes: [{ _id: 'abc' }] })), /notes/);
});

test('classifica novos, recuperados, existentes e conflitos', () => {
  const existing = new Map([
    [id(2), { userId: 'u1', deletedAt: null }],
    [id(3), { userId: 'u1', deletedAt: '2026-10-01' }],
    [id(4), { userId: 'outro', deletedAt: null }],
  ]);
  const docs = [{ _id: id(1) }, { _id: id(2) }, { _id: id(3) }, { _id: id(4) }, { _id: id(1) }];
  const result = classify(docs, existing, 'u1');
  assert.deepStrictEqual(
    [result.insert.length, result.restore.length, result.skip.length, result.conflicts.length],
    [1, 1, 2, 1],
  );
});

test('item apagado no backup e no banco continua como está', () => {
  const existing = new Map([[id(3), { userId: 'u1', deletedAt: '2026-10-01' }]]);
  const result = classify([{ _id: id(3), deletedAt: '2026-09-01' }], existing, 'u1');
  assert.strictEqual(result.skip.length, 1);
});

test('regra extra de duplicidade pula o item', () => {
  const result = classify(
    [{ _id: id(1), categoryId: 'c1' }],
    new Map(),
    'u1',
    (doc) => doc.categoryId === 'c1',
  );
  assert.deepStrictEqual([result.insert.length, result.skip.length], [0, 1]);
});

test('encontra referências quebradas', () => {
  const incoming = {
    transactions: [{ accountId: id(1), categoryId: id(9) }, { accountId: id(7) }],
    budgets: [{ categoryId: id(2) }],
  };
  const known = {
    accounts: new Set([id(1)]),
    categories: new Set([id(2)]),
    cards: new Set(),
  };
  assert.deepStrictEqual(brokenReferences(incoming, known), [
    { collection: 'transactions', field: 'accountId', count: 1 },
    { collection: 'transactions', field: 'categoryId', count: 1 },
  ]);
});
