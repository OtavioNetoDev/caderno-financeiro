const { test } = require('node:test');
const assert = require('node:assert');
const { escapeCell, toCsv } = require('../src/utils/csv');

test('protege contra fórmulas em planilhas', () => {
  for (const text of ['=1+1', '+55', '-cmd', '@SOMA(A1)']) {
    assert.strictEqual(escapeCell(text), "'" + text);
  }
  assert.strictEqual(escapeCell('lanche'), 'lanche');
});

test('escapa separador, aspas e quebras de linha', () => {
  assert.strictEqual(escapeCell('a;b'), '"a;b"');
  assert.strictEqual(escapeCell('diz "oi"'), '"diz ""oi"""');
  assert.strictEqual(escapeCell('linha 1\nlinha 2'), '"linha 1\nlinha 2"');
});

test('valores vazios viram células vazias', () => {
  assert.strictEqual(escapeCell(null), '');
  assert.strictEqual(escapeCell(undefined), '');
});

test('monta o CSV com BOM e separador ponto e vírgula', () => {
  const csv = toCsv(
    ['a', 'b'],
    [
      ['x;y', 'ok'],
      ['=1+1', null],
    ],
  );
  assert.strictEqual(csv, '\uFEFFa;b\r\n"x;y";ok\r\n\'=1+1;\r\n');
});
