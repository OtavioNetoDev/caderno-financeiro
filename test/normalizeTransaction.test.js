const { test } = require('node:test');
const assert = require('node:assert');
const normalizeTransaction = require('../src/utils/normalizeTransaction');

test('campos opcionais vazios viram ausentes', () => {
  const data = normalizeTransaction({ shareMode: '', categoryId: null, paymentMethod: '' });
  assert.strictEqual(data.shareMode, undefined);
  assert.strictEqual(data.categoryId, undefined);
  assert.strictEqual(data.paymentMethod, undefined);
});

test('mantém valores preenchidos e remove espaços do nome da pessoa', () => {
  const data = normalizeTransaction({ shareMode: 'with', personName: '  Raisa  ' });
  assert.strictEqual(data.shareMode, 'with');
  assert.strictEqual(data.personName, 'Raisa');
});
