const { test } = require('node:test');
const assert = require('node:assert');
const money = require('../public/js/money.js');

test('converte texto em centavos', () => {
  assert.strictEqual(money.parseMoney('12,50'), 1250);
  assert.strictEqual(money.parseMoney('R$ 1.234,56'), 123456);
  assert.strictEqual(money.parseMoney('12.5'), 1250);
  assert.strictEqual(money.parseMoney('1.234'), 123400);
  assert.strictEqual(money.parseMoney('7'), 700);
  assert.strictEqual(money.parseMoney('0,07'), 7);
  assert.strictEqual(money.parseMoney('19,99'), 1999);
});

test('rejeita entradas inválidas', () => {
  for (const value of ['', 'abc', '-5', '1,2,3', null, undefined, 12]) {
    assert.strictEqual(money.parseMoney(value), null);
  }
});

test('formata centavos em reais', () => {
  assert.strictEqual(money.formatMoney(123456).replace(/\u00a0/g, ' '), 'R$ 1.234,56');
});

test('limites do mês no fuso America/Bahia', () => {
  assert.deepStrictEqual(money.monthRange('2026-10'), {
    from: '2026-10-01T03:00:00.000Z',
    to: '2026-11-01T02:59:59.999Z',
  });
  assert.strictEqual(money.monthRange('2026-12').to, '2027-01-01T02:59:59.999Z');
});

test('datas enviadas à API caem ao meio-dia e aparecem no dia certo', () => {
  const iso = money.toApiDate('2026-10-02');
  assert.strictEqual(iso, '2026-10-02T12:00:00-03:00');
  assert.strictEqual(money.formatDate(iso), '02/10/2026');
});
