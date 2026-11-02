const { test } = require('node:test');
const assert = require('node:assert');
const { position, estimate, present, summarize } = require('../src/services/investmentService');

const now = new Date('2026-11-02T15:00:00Z');
const day = (text) => new Date(text + 'T12:00:00-03:00');

test('taxa anual informada usa juros compostos', () => {
  const current = position(
    [{ kind: 'contribution', amount: 1000000, date: day('2026-01-10') }],
    now,
  );
  const result = estimate({ type: 'cdb', annualRate: 12 }, current);
  assert.strictEqual(result.method, 'rate');
  assert.ok(Math.abs(result.yields.monthly - 9489) <= 1);
  assert.strictEqual(result.yields.yearly, 120000);
});

test('ganho por dia útil vira semana, mês e ano e mostra a taxa equivalente', () => {
  const current = position(
    [{ kind: 'contribution', amount: 1000000, date: day('2026-01-10') }],
    now,
  );
  const result = estimate({ type: 'treasury', annualRate: 0, dailyGain: 120 }, current);
  assert.strictEqual(result.method, 'daily');
  assert.deepStrictEqual(result.yields, { daily: 120, weekly: 600, monthly: 2520, yearly: 30240 });
  assert.strictEqual(result.annualRate, 3.02);
});

test('ganho por dia tem prioridade sobre a taxa', () => {
  const current = position(
    [{ kind: 'contribution', amount: 1000000, date: day('2026-01-10') }],
    now,
  );
  const result = estimate({ type: 'treasury', annualRate: 10, dailyGain: 100 }, current);
  assert.strictEqual(result.method, 'daily');
});

test('fundo imobiliário sem taxa rende o que pagou nos últimos 12 meses', () => {
  const current = position(
    [
      { kind: 'contribution', amount: 100000, quantity: 100, date: day('2025-10-10') },
      { kind: 'income', amount: 600, date: day('2026-03-10') },
      { kind: 'income', amount: 600, date: day('2026-09-10') },
    ],
    now,
  );
  const result = estimate({ type: 'fii', annualRate: 0 }, current);
  assert.strictEqual(result.method, 'income');
  assert.strictEqual(result.yields.yearly, 1200);
  assert.strictEqual(result.yields.monthly, 100);
  assert.strictEqual(result.annualRate, 1.2);
});

test('ações com taxa informada usam a taxa', () => {
  const current = position(
    [{ kind: 'contribution', amount: 100000, date: day('2026-01-10') }],
    now,
  );
  assert.strictEqual(estimate({ type: 'stock', annualRate: 8 }, current).method, 'rate');
});

test('sem saldo a taxa equivalente é zero', () => {
  const current = position([], now);
  assert.strictEqual(estimate({ type: 'treasury', dailyGain: 100 }, current).annualRate, 0);
  assert.strictEqual(estimate({ type: 'fii' }, current).annualRate, 0);
});

test('present devolve método e rendimentos anuais junto da posição', () => {
  const item = present({
    type: 'cdb',
    annualRate: 10,
    entries: [{ kind: 'contribution', amount: 100000, date: day('2026-01-10') }],
  });
  assert.strictEqual(item.estimate.method, 'rate');
  assert.strictEqual(item.yields.yearly, 10000);
  assert.strictEqual(item.position.balance, 100000);
});

test('resumo separa a minha carteira dos investimentos de outras pessoas', () => {
  const entries = (amount) => [{ kind: 'contribution', amount, date: day('2026-01-10') }];
  const summary = summarize([
    { type: 'cdb', annualRate: 12, entries: entries(1000000) },
    { type: 'cdb', annualRate: 12, personName: 'Sobrinho', entries: entries(200000) },
    { type: 'cdb', annualRate: 12, personName: ' sobrinho ', entries: entries(100000) },
    { type: 'cdb', annualRate: 12, personName: 'Mãe', entries: entries(500000) },
    { type: 'cdb', annualRate: 12, personName: 'Mãe', archived: true, entries: entries(999999) },
  ]);
  assert.strictEqual(summary.count, 1);
  assert.strictEqual(summary.balance, 1000000);
  assert.deepStrictEqual(
    summary.others.map((item) => [item.personName, item.count, item.balance]),
    [
      ['Mãe', 1, 500000],
      ['Sobrinho', 2, 300000],
    ],
  );
});
