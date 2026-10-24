const { test } = require('node:test');
const assert = require('node:assert');
const { extractAmount } = require('../src/importers/amount');
const { classify, detectPerson } = require('../src/importers/classifier');

test('lê um valor simples com alta confiança', () => {
  assert.deepStrictEqual(extractAmount('Lanche com Maria 12,50'), {
    cents: 1250,
    confidence: 'high',
    count: 1,
  });
  assert.strictEqual(extractAmount('R$ 1.455,59').cents, 145559);
  assert.strictEqual(extractAmount('10 reais x frango').cents, 1000);
});

test('ignora unidades, datas, ordinais e códigos', () => {
  assert.strictEqual(extractAmount('comprei um ssd de 1 tb por 470 reais').cents, 47000);
  assert.strictEqual(extractAmount('1ª parcela do oculos 150').cents, 15000);
  assert.deepStrictEqual(extractAmount('dia 01/05/2026 sem valor'), {
    cents: null,
    confidence: 'low',
    count: 0,
  });
  assert.strictEqual(extractAmount('mxrf11 sem numero').cents, null);
});

test('com vários números, prefere o que tem "reais" e baixa a confiança', () => {
  assert.deepStrictEqual(extractAmount('paguei 80 reais e 5 de troco'), {
    cents: 8000,
    confidence: 'low',
    count: 2,
  });
});

test('classifica tipo e categoria', () => {
  assert.deepStrictEqual(classify('recebi salario 1.500,00'), {
    type: 'income',
    category: 'Salário',
    flags: [],
  });
  assert.deepStrictEqual(classify('paguei mercado 80 reais'), {
    type: 'expense',
    category: 'Mercado',
    flags: [],
  });
  assert.deepStrictEqual(classify('investi 200 reais no cofrinho'), {
    type: 'investment',
    category: 'Investimentos',
    flags: [],
  });
  assert.strictEqual(classify('Açaí com Maria').category, 'Lanche');
  assert.strictEqual(classify('comprei um ssd').category, 'Equipamentos de trabalho');
  assert.deepStrictEqual(classify('algo sem pista'), {
    type: 'expense',
    category: null,
    flags: [],
  });
});

test('marca trechos de dívida', () => {
  assert.deepStrictEqual(classify('Fulano me pagou 1000 reais, a divida fica de 8000'), {
    type: 'income',
    category: 'Outras receitas',
    flags: ['dívida'],
  });
});

test('reconhece "com" e "de" uma pessoa conhecida', () => {
  assert.deepStrictEqual(detectPerson('Lanche com Maria', ['Maria']), {
    personName: 'Maria',
    shareMode: 'with',
  });
  assert.deepStrictEqual(detectPerson('Lanche eu e Maria', ['Maria']), {
    personName: 'Maria',
    shareMode: 'with',
  });
  assert.deepStrictEqual(detectPerson('Lanche de Maria', ['Maria']), {
    personName: 'Maria',
    shareMode: 'for',
  });
  assert.deepStrictEqual(detectPerson('Lanche sozinho', ['Maria']), {
    personName: '',
    shareMode: '',
  });
});
