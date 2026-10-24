const { test } = require('node:test');
const assert = require('node:assert');
const { parseText } = require('../src/importers/textParser');
const { isValidDay, dayOf } = require('../src/utils/day');

// Exemplo fictício no mesmo formato das anotações.
const SAMPLE = [
  'MÊS DE MAIO:',
  'DIA: 01/05/2026: Lanche com Maria 12,50',
  'dia 02/05/2026: recebi salario 1.500,00 ||| paguei mercado 80 reais',
  'DIA: 03/05/2026: Açaí',
  'dia 04/05/2026: comprei um ssd de 1 tb por 470 reais',
  'dia 05/05/2026: Fulano me pagou 1000 reais, a divida fica de 8000',
  'DIA 06/07/2026: pastel 5 reais',
  'isto não é um lançamento',
  'DIA: 31/02/2026: data impossível 10',
  'MÊS DE JUNHO:',
  'DIA 01/06/2026: investi 200 reais no cofrinho',
].join('\n');

test('lê seções, datas e vários trechos por linha', () => {
  const { rows, ignored } = parseText(SAMPLE, { people: ['Maria'] });
  assert.strictEqual(rows.length, 8);
  assert.strictEqual(ignored.length, 2);

  const [lanche, salario, mercado, semValor, ssd, divida, foraDaSecao, invest] = rows;

  assert.strictEqual(lanche.date, '2026-05-01');
  assert.strictEqual(lanche.amount, 1250);
  assert.strictEqual(lanche.category, 'Lanche');
  assert.strictEqual(lanche.personName, 'Maria');
  assert.strictEqual(lanche.shareMode, 'with');
  assert.strictEqual(lanche.selected, true);

  assert.strictEqual(salario.amount, 150000);
  assert.strictEqual(salario.type, 'income');
  assert.strictEqual(salario.category, 'Salário');

  assert.strictEqual(mercado.amount, 8000);
  assert.strictEqual(mercado.category, 'Mercado');

  assert.strictEqual(semValor.amount, null);
  assert.ok(semValor.flags.includes('sem valor'));
  assert.strictEqual(semValor.selected, false);

  assert.strictEqual(ssd.amount, 47000);
  assert.strictEqual(ssd.category, 'Equipamentos de trabalho');

  assert.strictEqual(divida.amount, 100000);
  assert.deepStrictEqual(divida.flags, ['dívida', 'vários valores']);
  assert.strictEqual(divida.selected, false);

  assert.strictEqual(foraDaSecao.date, '2026-07-06');
  assert.ok(foraDaSecao.flags.includes('data fora da seção'));
  assert.strictEqual(foraDaSecao.selected, false);

  assert.strictEqual(invest.type, 'investment');
  assert.strictEqual(invest.category, 'Investimentos');
  assert.strictEqual(invest.amount, 20000);
  assert.strictEqual(invest.selected, true);
});

test('registra o motivo das linhas ignoradas', () => {
  const { ignored } = parseText(SAMPLE);
  assert.deepStrictEqual(
    ignored.map((item) => item.reason),
    ['linha não reconhecida', 'data inválida'],
  );
});

test('valida dias e converte para o fuso do Brasil', () => {
  assert.strictEqual(isValidDay('2028-02-29'), true);
  assert.strictEqual(isValidDay('2026-02-29'), false);
  assert.strictEqual(isValidDay('02/03/2026'), false);
  assert.strictEqual(dayOf(new Date('2026-05-01T15:00:00Z')), '2026-05-01');
  assert.strictEqual(dayOf('2026-05-01'), '2026-05-01');
});
