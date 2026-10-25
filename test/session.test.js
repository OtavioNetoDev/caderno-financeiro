const { test } = require('node:test');
const assert = require('node:assert');
const { isSessionRevoked } = require('../src/utils/session');

const at = (iso) => Math.floor(new Date(iso).getTime() / 1000);

test('sem troca de senha, a sessão continua válida', () => {
  assert.strictEqual(isSessionRevoked(null, at('2026-10-25T10:00:00Z')), false);
  assert.strictEqual(isSessionRevoked(undefined, at('2026-10-25T10:00:00Z')), false);
});

test('token emitido antes da troca de senha é encerrado', () => {
  assert.strictEqual(
    isSessionRevoked(new Date('2026-10-25T10:05:00Z'), at('2026-10-25T10:00:00Z')),
    true,
  );
});

test('token emitido depois (ou no mesmo segundo) da troca continua válido', () => {
  assert.strictEqual(
    isSessionRevoked(new Date('2026-10-25T10:05:00Z'), at('2026-10-25T10:06:00Z')),
    false,
  );
  assert.strictEqual(
    isSessionRevoked(new Date('2026-10-25T10:05:00.400Z'), at('2026-10-25T10:05:00Z')),
    false,
  );
});
