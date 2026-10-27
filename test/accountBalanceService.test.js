const { test } = require('node:test');
const assert = require('node:assert');
const { computeBalances } = require('../src/services/accountBalanceService');

const accounts = [
  { _id: 'a1', name: 'Nubank', type: 'checking', initialBalance: 10000 },
  { _id: 'a2', name: 'Carteira', type: 'wallet', initialBalance: 0 },
];

test('soma receitas e subtrai despesas e investimentos', () => {
  const groups = [
    { accountId: 'a1', type: 'income', status: 'confirmed', total: 50000 },
    { accountId: 'a1', type: 'expense', status: 'confirmed', total: 12000 },
    { accountId: 'a1', type: 'investment', status: 'confirmed', total: 8000 },
  ];
  const { items, netWorth } = computeBalances(accounts, groups);
  assert.strictEqual(items[0].balance, 40000);
  assert.strictEqual(netWorth, 40000);
});

test('transferência tira da origem e entra no destino sem mudar o total', () => {
  const groups = [
    { accountId: 'a1', toAccountId: 'a2', type: 'transfer', status: 'confirmed', total: 3000 },
  ];
  const { items, netWorth } = computeBalances(accounts, groups);
  assert.deepStrictEqual([items[0].balance, items[1].balance], [7000, 3000]);
  assert.strictEqual(netWorth, 10000);
});

test('pendentes ficam fora do saldo e entram só na projeção', () => {
  const groups = [{ accountId: 'a2', type: 'expense', status: 'pending', total: 2500 }];
  const result = computeBalances(accounts, groups);
  assert.strictEqual(result.items[1].balance, 0);
  assert.strictEqual(result.pending, -2500);
  assert.strictEqual(result.projected, 7500);
});

test('ignora lançamentos de contas que não estão na lista', () => {
  const groups = [{ accountId: 'x9', type: 'expense', status: 'confirmed', total: 999 }];
  assert.strictEqual(computeBalances(accounts, groups).netWorth, 10000);
});
