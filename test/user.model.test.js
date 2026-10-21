const { test } = require('node:test');
const assert = require('node:assert');
const User = require('../src/models/User');

function build(overrides = {}) {
  return new User({
    name: 'Maria',
    email: 'maria@exemplo.com',
    passwordHash: 'hash-de-teste',
    ...overrides,
  });
}

function rejectsOn(field, user) {
  return assert.rejects(user.validate(), (err) => {
    assert.ok(err.errors[field], `esperava erro em ${field}`);
    return true;
  });
}

test('aceita um usuário válido', async () => {
  await build().validate();
});

test('exige nome', () => rejectsOn('name', build({ name: '' })));

test('rejeita e-mail inválido', () => rejectsOn('email', build({ email: 'maria-sem-arroba' })));

test('exige o hash da senha', () => rejectsOn('passwordHash', build({ passwordHash: undefined })));

test('normaliza o e-mail para minúsculas', () => {
  assert.strictEqual(build({ email: 'MARIA@Exemplo.COM' }).email, 'maria@exemplo.com');
});

test('não expõe o hash da senha no JSON', () => {
  assert.strictEqual(build().toJSON().passwordHash, undefined);
});
