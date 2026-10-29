const { test } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Recurring = require('../src/models/Recurring');
const Transaction = require('../src/models/Transaction');

const newId = () => new mongoose.Types.ObjectId();

function build(overrides = {}) {
  return new Recurring({
    userId: newId(),
    description: 'Netflix',
    amount: 5590,
    type: 'expense',
    dayOfMonth: 15,
    startMonth: '2026-01',
    accountId: newId(),
    ...overrides,
  });
}

function rejectsOn(field, doc) {
  return assert.rejects(doc.validate(), (err) => {
    assert.ok(err.errors[field], `esperava erro em ${field}`);
    return true;
  });
}

test('aceita um recorrente válido e aplica os padrões', async () => {
  const doc = build();
  await doc.validate();
  assert.strictEqual(doc.status, 'pending');
  assert.strictEqual(doc.active, true);
  assert.strictEqual(doc.endMonth, null);
});

test('rejeita valor com casas decimais, zero e tipo inválido', async () => {
  await rejectsOn('amount', build({ amount: 12.5 }));
  await rejectsOn('amount', build({ amount: 0 }));
  await rejectsOn('type', build({ type: 'transfer' }));
});

test('rejeita dia fora de 1 a 31 e mês fora do formato', async () => {
  await rejectsOn('dayOfMonth', build({ dayOfMonth: 0 }));
  await rejectsOn('dayOfMonth', build({ dayOfMonth: 32 }));
  await rejectsOn('startMonth', build({ startMonth: '2026-13' }));
  await rejectsOn('endMonth', build({ endMonth: '26-01' }));
});

test('exige descrição e conta', async () => {
  await rejectsOn('description', build({ description: '' }));
  await rejectsOn('accountId', build({ accountId: undefined }));
});

test('o lançamento guarda de qual recorrente e mês veio', async () => {
  const id = newId();
  const transaction = new Transaction({
    userId: newId(),
    type: 'expense',
    amount: 5590,
    date: new Date('2026-10-15T15:00:00Z'),
    accountId: newId(),
    recurringId: id,
    recurringMonth: '2026-10',
  });
  await transaction.validate();
  assert.strictEqual(String(transaction.recurringId), String(id));
  assert.strictEqual(transaction.recurringMonth, '2026-10');
  assert.strictEqual(new Transaction({}).recurringId, null);
});
