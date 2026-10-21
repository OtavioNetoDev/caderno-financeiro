const { test } = require('node:test');
const assert = require('node:assert');

const SECRET = 'segredo-de-teste-com-pelo-menos-32-caracteres';
process.env.JWT_SECRET = SECRET;
const { signToken, verifyToken } = require('../src/utils/token');

const USER_ID = '64b7f0c2a1b2c3d4e5f60718';

test('gera e valida um token, devolvendo o id do usuário', () => {
  assert.deepStrictEqual(verifyToken(signToken(USER_ID)), { userId: USER_ID });
});

test('rejeita token adulterado', () => {
  const [header, payload, signature] = signToken(USER_ID).split('.');
  const flipped = (signature[0] === 'a' ? 'b' : 'a') + signature.slice(1);
  assert.throws(() => verifyToken([header, payload, flipped].join('.')), { status: 401 });
});

test('rejeita token expirado', () => {
  const token = signToken(USER_ID, { expiresIn: -10 });
  assert.throws(() => verifyToken(token), { status: 401 });
});

test('rejeita token assinado com outro segredo', () => {
  const token = signToken(USER_ID);
  process.env.JWT_SECRET = 'outro-segredo-diferente-com-32-caracteres-ou-mais';
  assert.throws(() => verifyToken(token), { status: 401 });
  process.env.JWT_SECRET = SECRET;
});

test('recusa assinar sem um segredo forte', () => {
  process.env.JWT_SECRET = 'curto';
  assert.throws(() => signToken(USER_ID), /JWT_SECRET/);
  process.env.JWT_SECRET = SECRET;
});
