const { test } = require('node:test');
const assert = require('node:assert');
const filters = require('../public/js/transactionFilters.js');

const names = {
  category: new Map([
    ['c1', 'Mercado'],
    ['c2', 'Lazer'],
  ]),
  account: new Map([
    ['a1', 'Nubank'],
    ['a2', 'Carteira'],
  ]),
};

const items = [
  {
    _id: '1',
    type: 'expense',
    amount: 5000,
    status: 'confirmed',
    categoryId: 'c1',
    accountId: 'a1',
    description: 'Açaí da praia',
  },
  {
    _id: '2',
    type: 'income',
    amount: 100000,
    status: 'confirmed',
    categoryId: null,
    accountId: 'a1',
    description: 'Salário',
  },
  {
    _id: '3',
    type: 'expense',
    amount: 3000,
    status: 'pending',
    categoryId: 'c2',
    accountId: 'a2',
    description: 'Cinema',
    personName: 'Raisa',
    notes: 'ingresso dobrado',
  },
  {
    _id: '4',
    type: 'transfer',
    amount: 20000,
    status: 'confirmed',
    categoryId: null,
    accountId: 'a1',
    toAccountId: 'a2',
    description: '',
  },
  {
    _id: '5',
    type: 'expense',
    amount: 90000,
    status: 'confirmed',
    categoryId: null,
    accountId: 'a1',
    description: 'Fatura',
    invoicePayment: true,
  },
  {
    _id: '6',
    type: 'investment',
    amount: 10000,
    status: 'confirmed',
    categoryId: null,
    accountId: 'a1',
    description: 'Aporte CDB',
  },
];

const run = (patch) =>
  filters.filterTransactions(items, { ...filters.EMPTY, ...patch }, names).map((item) => item._id);

test('sem filtros devolve tudo e hasFilters é falso', () => {
  assert.deepStrictEqual(run({}), ['1', '2', '3', '4', '5', '6']);
  assert.strictEqual(filters.hasFilters(filters.EMPTY), false);
  assert.strictEqual(filters.hasFilters({ ...filters.EMPTY, text: '   ' }), false);
  assert.strictEqual(filters.hasFilters({ ...filters.EMPTY, type: 'income' }), true);
});

test('normalize ignora acento, caixa e espaços nas pontas', () => {
  assert.strictEqual(filters.normalize('  Açaí  '), 'acai');
  assert.strictEqual(filters.normalize(null), '');
});

test('busca por texto ignora acento e caixa', () => {
  assert.deepStrictEqual(run({ text: 'ACAI' }), ['1']);
  assert.deepStrictEqual(run({ text: 'salario' }), ['2']);
});

test('busca olha descrição, observação, pessoa, categoria e contas', () => {
  assert.deepStrictEqual(run({ text: 'ingresso' }), ['3']);
  assert.deepStrictEqual(run({ text: 'raisa' }), ['3']);
  assert.deepStrictEqual(run({ text: 'mercado' }), ['1']);
  assert.deepStrictEqual(run({ text: 'carteira' }), ['3', '4']);
});

test('várias palavras exigem todas, em qualquer ordem', () => {
  assert.deepStrictEqual(run({ text: 'praia acai' }), ['1']);
  assert.deepStrictEqual(run({ text: 'praia cinema' }), []);
});

test('filtra por tipo e por status', () => {
  assert.deepStrictEqual(run({ type: 'expense' }), ['1', '3', '5']);
  assert.deepStrictEqual(run({ status: 'pending' }), ['3']);
  assert.deepStrictEqual(run({ type: 'expense', status: 'confirmed' }), ['1', '5']);
});

test('filtra por categoria e por "sem categoria"', () => {
  assert.deepStrictEqual(run({ categoryId: 'c2' }), ['3']);
  assert.deepStrictEqual(run({ categoryId: filters.NO_CATEGORY }), ['2', '4', '5', '6']);
});

test('filtros combinam entre si', () => {
  assert.deepStrictEqual(run({ type: 'expense', text: 'cinema', categoryId: 'c2' }), ['3']);
  assert.deepStrictEqual(run({ type: 'income', text: 'cinema' }), []);
});

test('totals soma só confirmados e ignora transferência e pagamento de fatura', () => {
  const sum = filters.totals(items);
  assert.strictEqual(sum.count, 6);
  assert.strictEqual(sum.income, 100000);
  assert.strictEqual(sum.expense, 5000);
  assert.strictEqual(sum.investment, 10000);
  assert.strictEqual(sum.pending, 1);
});

test('totals de lista vazia', () => {
  assert.deepStrictEqual(filters.totals([]), {
    count: 0,
    income: 0,
    expense: 0,
    investment: 0,
    pending: 0,
  });
});
