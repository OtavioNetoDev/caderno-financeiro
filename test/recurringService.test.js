const { test } = require('node:test');
const assert = require('node:assert');
const service = require('../src/services/recurringService');

const valid = (extra = {}) => ({
  description: ' Netflix ',
  amount: 5590,
  type: 'expense',
  dayOfMonth: 15,
  startMonth: '2026-01',
  accountId: 'a1',
  ...extra,
});

test('dayForMonth leva o dia 31 ao último dia dos meses curtos', () => {
  assert.strictEqual(service.dayForMonth('2026-02', 31), 28);
  assert.strictEqual(service.dayForMonth('2028-02', 31), 29);
  assert.strictEqual(service.dayForMonth('2026-04', 31), 30);
  assert.strictEqual(service.dayForMonth('2026-10', 31), 31);
  assert.strictEqual(service.dayForMonth('2026-10', 5), 5);
});

test('occurrenceDate cai ao meio-dia no fuso do Brasil', () => {
  assert.strictEqual(
    service.occurrenceDate('2026-10', 15).toISOString(),
    '2026-10-15T15:00:00.000Z',
  );
  assert.strictEqual(
    service.occurrenceDate('2026-02', 30).toISOString(),
    '2026-02-28T15:00:00.000Z',
  );
});

test('isActiveInMonth respeita início, fim e pausa', () => {
  const rec = { startMonth: '2026-03', endMonth: '2026-06', active: true };
  assert.strictEqual(service.isActiveInMonth(rec, '2026-02'), false);
  assert.strictEqual(service.isActiveInMonth(rec, '2026-03'), true);
  assert.strictEqual(service.isActiveInMonth(rec, '2026-06'), true);
  assert.strictEqual(service.isActiveInMonth(rec, '2026-07'), false);
  assert.strictEqual(service.isActiveInMonth({ ...rec, active: false }, '2026-04'), false);
  assert.strictEqual(service.isActiveInMonth({ startMonth: '2026-03' }, '2030-01'), true);
});

test('validateRecurring limpa os dados e aplica padrões', () => {
  const clean = service.validateRecurring(valid({ categoryId: '', endMonth: '' }));
  assert.strictEqual(clean.description, 'Netflix');
  assert.strictEqual(clean.status, 'pending');
  assert.strictEqual(clean.categoryId, null);
  assert.strictEqual(clean.endMonth, null);
  assert.strictEqual(clean.active, true);
});

test('validateRecurring recusa dados inválidos', () => {
  const bad = [
    { description: '  ' },
    { description: 'x'.repeat(101) },
    { amount: 0 },
    { amount: 12.5 },
    { type: 'transfer' },
    { dayOfMonth: 0 },
    { dayOfMonth: 32 },
    { dayOfMonth: 1.5 },
    { startMonth: '2026-13' },
    { endMonth: '2025-12' },
    { endMonth: 'abc' },
    { status: 'done' },
    { accountId: '' },
  ];
  for (const patch of bad) {
    assert.throws(
      () => service.validateRecurring(valid(patch)),
      { status: 400 },
      JSON.stringify(patch),
    );
  }
});

const recurrings = [
  {
    _id: 'r1',
    description: 'Netflix',
    amount: 5590,
    type: 'expense',
    dayOfMonth: 15,
    startMonth: '2026-01',
    endMonth: null,
    status: 'pending',
    accountId: 'a1',
    categoryId: 'c1',
    active: true,
  },
  {
    _id: 'r2',
    description: 'Aluguel',
    amount: 90000,
    type: 'expense',
    dayOfMonth: 31,
    startMonth: '2026-01',
    endMonth: null,
    status: 'confirmed',
    accountId: 'a1',
    active: true,
  },
  {
    _id: 'r3',
    description: 'Curso',
    amount: 10000,
    type: 'expense',
    dayOfMonth: 5,
    startMonth: '2026-01',
    endMonth: '2026-06',
    status: 'pending',
    accountId: 'a1',
    active: true,
  },
  {
    _id: 'r4',
    description: 'Pausada',
    amount: 100,
    type: 'expense',
    dayOfMonth: 1,
    startMonth: '2026-01',
    status: 'pending',
    accountId: 'a1',
    active: false,
  },
  {
    _id: 'r5',
    description: 'Conta sumiu',
    amount: 100,
    type: 'income',
    dayOfMonth: 1,
    startMonth: '2026-01',
    status: 'pending',
    accountId: 'gone',
    active: true,
  },
];

test('planGeneration gera só o que está ativo no mês', () => {
  const plan = service.planGeneration(recurrings, '2026-10', new Set(), new Set(['a1']));
  assert.deepStrictEqual(
    plan.toCreate.map((item) => item.description),
    ['Netflix', 'Aluguel'],
  );
  assert.strictEqual(plan.missingAccount, 1);
  assert.strictEqual(plan.alreadyExisted, 0);
  const rent = plan.toCreate[1];
  assert.strictEqual(rent.date.toISOString(), '2026-10-31T15:00:00.000Z');
  assert.strictEqual(rent.status, 'confirmed');
  assert.strictEqual(rent.recurringMonth, '2026-10');
  assert.strictEqual(rent.categoryId, null);
});

test('planGeneration não repete o que já foi gerado', () => {
  const existing = new Set(['r1|2026-10']);
  const plan = service.planGeneration(recurrings, '2026-10', existing, new Set(['a1']));
  assert.deepStrictEqual(
    plan.toCreate.map((item) => item.description),
    ['Aluguel'],
  );
  assert.strictEqual(plan.alreadyExisted, 1);
});

test('planGeneration respeita o mês final', () => {
  const june = service.planGeneration(recurrings, '2026-06', new Set(), new Set(['a1']));
  assert.ok(june.toCreate.some((item) => item.description === 'Curso'));
  const july = service.planGeneration(recurrings, '2026-07', new Set(), new Set(['a1']));
  assert.ok(!july.toCreate.some((item) => item.description === 'Curso'));
});

test('planGeneration antes do início não gera nada', () => {
  const plan = service.planGeneration(recurrings, '2025-12', new Set(), new Set(['a1']));
  assert.strictEqual(plan.toCreate.length, 0);
});
