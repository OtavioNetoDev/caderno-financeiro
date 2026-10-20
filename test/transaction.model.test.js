const { test } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Transaction = require('../src/models/Transaction');

const newId = () => new mongoose.Types.ObjectId();

function build(overrides = {}) {
  return new Transaction({
    userId: newId(),
    type: 'expense',
    amount: 1200,
    date: new Date('2026-10-17'),
    accountId: newId(),
    ...overrides,
  });
}

function rejectsOn(field, transaction) {
  return assert.rejects(transaction.validate(), (err) => {
    assert.ok(err.errors[field], `esperava erro em ${field}`);
    return true;
  });
}

test('aceita uma despesa válida', async () => {
  await build().validate();
});

test('rejeita valor com casas decimais (deve ser em centavos)', () =>
  rejectsOn('amount', build({ amount: 12.5 })));

test('rejeita valor zero ou negativo', async () => {
  await rejectsOn('amount', build({ amount: 0 }));
  await rejectsOn('amount', build({ amount: -300 }));
});

test('rejeita tipo desconhecido', () => rejectsOn('type', build({ type: 'presente' })));

test('exige conta de origem', () => rejectsOn('accountId', build({ accountId: undefined })));

test('transferência exige conta de destino', () =>
  rejectsOn('toAccountId', build({ type: 'transfer' })));

test('transferência não pode ter origem igual ao destino', () => {
  const accountId = newId();
  return rejectsOn('toAccountId', build({ type: 'transfer', accountId, toAccountId: accountId }));
});

test('aceita transferência entre contas diferentes', async () => {
  await build({ type: 'transfer', toAccountId: newId() }).validate();
});

test('destino só é permitido em transferências', () =>
  rejectsOn('toAccountId', build({ toAccountId: newId() })));
