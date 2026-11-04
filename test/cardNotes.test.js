const { test } = require('node:test');
const assert = require('node:assert');
const { describePurchase, describeInvoice } = require('../public/js/cardNotes');
const { referenceMonth, dueMonth } = require('../src/services/cardService');

const card = { closingDay: 5, dueDay: 10 };

test('compra depois do fechamento: feita em setembro, paga em outubro, gasto de outubro', () => {
  const note = describePurchase({ purchaseDate: '2026-09-09', ...card });
  assert.strictEqual(note.referenceMonth, '2026-10');
  assert.strictEqual(note.dueMonth, '2026-10');
  assert.strictEqual(
    note.text,
    'Comprado em setembro (09/09), mas só paga em outubro (vence 10/10). Conta como gasto de outubro.',
  );
});

test('compra até o fechamento: feita e paga no mesmo mês', () => {
  const note = describePurchase({ purchaseDate: '2026-10-03', ...card });
  assert.strictEqual(note.referenceMonth, '2026-10');
  assert.strictEqual(
    note.text,
    'Comprado em outubro (03/10) e pago em outubro (vence 10/10). Conta como gasto de outubro.',
  );
});

test('o próprio dia do fechamento ainda entra na fatura que fecha', () => {
  assert.strictEqual(
    describePurchase({ purchaseDate: '2026-10-05', ...card }).referenceMonth,
    '2026-10',
  );
  assert.strictEqual(
    describePurchase({ purchaseDate: '2026-10-06', ...card }).referenceMonth,
    '2026-11',
  );
});

test('parcelas explicam cada mês', () => {
  const note = describePurchase({ purchaseDate: '2026-09-09', ...card, number: 2, of: 3 });
  assert.strictEqual(note.referenceMonth, '2026-11');
  assert.strictEqual(
    note.text,
    'Parcela 2 de 3 da compra de 09/09 (setembro). A fatura fecha em 05/11 e vence em 10/11. Conta como gasto de novembro.',
  );
});

test('vencimento antes do fechamento cai no mês seguinte', () => {
  const note = describePurchase({ purchaseDate: '2026-09-20', closingDay: 25, dueDay: 5 });
  assert.strictEqual(note.referenceMonth, '2026-09');
  assert.strictEqual(note.dueMonth, '2026-10');
  assert.strictEqual(
    note.text,
    'Comprado em setembro (20/09), mas só paga em outubro (vence 05/10). Conta como gasto de setembro.',
  );
});

test('virada de ano mostra o ano quando ele muda', () => {
  const note = describePurchase({ purchaseDate: '2026-12-20', ...card });
  assert.strictEqual(note.referenceMonth, '2027-01');
  assert.ok(note.text.includes('janeiro de 2027'));
});

test('dia 31 de fechamento vira o último dia de meses curtos', () => {
  const note = describePurchase({ purchaseDate: '2026-04-10', closingDay: 31, dueDay: 10 });
  assert.strictEqual(note.closing, '30/04');
});

test('a regra confere com a do serviço de cartões', () => {
  for (const [closingDay, dueDay] of [
    [5, 10],
    [25, 5],
    [31, 15],
  ]) {
    for (let day = 0; day < 400; day += 3) {
      const date = new Date(Date.UTC(2026, 0, 1 + day, 15));
      const note = describePurchase({ purchaseDate: date, closingDay, dueDay });
      const reference = referenceMonth(date, closingDay);
      assert.strictEqual(note.referenceMonth, reference);
      assert.strictEqual(note.dueMonth, dueMonth(reference, closingDay, dueDay));
    }
  }
});

test('descrição da fatura mostra período, vencimento e mês do gasto', () => {
  assert.strictEqual(
    describeInvoice({ month: '2026-10', ...card }),
    'Fatura de outubro: compras de 06/09 a 05/10, vence em 10/10. Todas contam como gasto de outubro.',
  );
});
