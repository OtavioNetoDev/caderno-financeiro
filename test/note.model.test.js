const { test } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Note = require('../src/models/Note');

const build = (overrides = {}) =>
  new Note({
    userId: new mongoose.Types.ObjectId(),
    month: '2026-10',
    content: 'Revisar gastos com lanche',
    ...overrides,
  });

test('aceita uma nota válida', async () => {
  await build().validate();
});

test('rejeita mês fora do formato AAAA-MM', async () => {
  for (const month of ['10/2026', '2026-13', 'outubro']) {
    await assert.rejects(build({ month }).validate(), (err) => Boolean(err.errors.month));
  }
});

test('exige o texto da nota', async () => {
  await assert.rejects(build({ content: '   ' }).validate(), (err) => Boolean(err.errors.content));
});
