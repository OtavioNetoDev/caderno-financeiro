const { test } = require('node:test');
const assert = require('node:assert');

process.env.BCRYPT_ROUNDS = '4';
const { validatePassword, hashPassword, verifyPassword } = require('../src/utils/password');

test('aceita uma senha válida', () => {
  assert.strictEqual(validatePassword('senha-forte-123'), null);
});

test('rejeita senha curta, ausente, não textual ou longa demais', () => {
  assert.ok(validatePassword('curta'));
  assert.ok(validatePassword(undefined));
  assert.ok(validatePassword({ $ne: '' }));
  assert.ok(validatePassword('a'.repeat(73)));
});

test('o hash não contém a senha e confere com a senha correta', async () => {
  const hash = await hashPassword('senha-forte-123');
  assert.ok(!hash.includes('senha-forte-123'));
  assert.strictEqual(await verifyPassword('senha-forte-123', hash), true);
});

test('rejeita senha errada', async () => {
  const hash = await hashPassword('senha-forte-123');
  assert.strictEqual(await verifyPassword('outra-senha-123', hash), false);
});

test('sem hash (usuário inexistente) sempre retorna falso', async () => {
  assert.strictEqual(await verifyPassword('qualquer-senha', undefined), false);
});
