const { test } = require('node:test');
const assert = require('node:assert');
const { duplicateKey, markDuplicates, validateRow } = require('../src/services/importService');

test('a chave ignora acentos, caixa e espaços e usa o dia do Brasil', () => {
  const stored = duplicateKey({
    date: new Date('2026-05-01T15:00:00Z'),
    amount: 1250,
    type: 'expense',
    description: ' Açaí  ',
  });
  const imported = duplicateKey({
    date: '2026-05-01',
    amount: 1250,
    type: 'expense',
    text: 'acai',
  });
  assert.strictEqual(stored, imported);
});

test('marca duplicados respeitando a quantidade existente', () => {
  const existing = [
    { date: new Date('2026-05-01T15:00:00Z'), amount: 500, type: 'expense', description: 'pastel' },
  ];
  const base = { date: '2026-05-01', amount: 500, type: 'expense', text: 'Pastel' };
  const result = markDuplicates([base, { ...base }, { ...base, date: '2026-05-02' }], existing);
  assert.deepStrictEqual(
    result.map((row) => row.duplicate),
    [true, false, false],
  );
});

test('linhas sem valor nunca são duplicadas', () => {
  assert.strictEqual(
    markDuplicates([{ date: '2026-05-01', amount: null, type: 'expense', text: 'x' }], [])[0]
      .duplicate,
    false,
  );
});

test('valida as linhas antes de salvar', () => {
  const valid = { date: '2026-05-01', amount: 1250, type: 'expense', description: 'Lanche' };
  assert.strictEqual(validateRow(valid), null);
  assert.ok(validateRow({ ...valid, date: '2026-02-30' }));
  assert.ok(validateRow({ ...valid, amount: 12.5 }));
  assert.ok(validateRow({ ...valid, amount: 0 }));
  assert.ok(validateRow({ ...valid, type: 'transfer' }));
  assert.ok(validateRow({ ...valid, description: '   ' }));
  assert.ok(validateRow({ ...valid, shareMode: 'x' }));
  assert.ok(validateRow(null));
});
