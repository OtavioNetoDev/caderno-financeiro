const { test } = require('node:test');
const assert = require('node:assert');
const { slugify } = require('../public/js/chart-export.js');

test('o nome do arquivo não tem acento, espaço nem símbolo', () => {
  assert.strictEqual(slugify('Despesas por categoria'), 'despesas-por-categoria');
  assert.strictEqual(slugify('  Receitas & Despesas (mês)  '), 'receitas-despesas-mes');
});

test('sem título usa um nome padrão', () => {
  assert.strictEqual(slugify(''), 'grafico');
  assert.strictEqual(slugify(undefined), 'grafico');
  assert.strictEqual(slugify('***'), 'grafico');
});
