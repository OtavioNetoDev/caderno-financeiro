const { test } = require('node:test');
const assert = require('node:assert');
const { parseStatementLines, parseDocumentText } = require('../src/importers/statementLines');

const STATEMENT = [
  'EXTRATO',
  '02/10/2026 SALARIO EMPRESA 1.500,00 C',
  '03/10/2026 PASTEL LOJA -12,50',
  '04/10 COMPRA MERCADO 80,00',
  'linha sem data',
].join('\n');

test('lê linhas de extrato com crédito, sinal e valores sem indicação', () => {
  const { rows, ignored } = parseStatementLines(STATEMENT, { year: 2026 });
  assert.strictEqual(rows.length, 3);
  assert.strictEqual(ignored.length, 2);

  assert.deepStrictEqual(
    [rows[0].date, rows[0].amount, rows[0].type, rows[0].confidence],
    ['2026-10-02', 150000, 'income', 'high'],
  );
  assert.deepStrictEqual(
    [rows[1].amount, rows[1].type, rows[1].confidence],
    [1250, 'expense', 'high'],
  );

  assert.strictEqual(rows[2].date, '2026-10-04');
  assert.strictEqual(rows[2].amount, 8000);
  assert.deepStrictEqual(rows[2].flags, ['tipo a confirmar', 'ano assumido']);
  assert.strictEqual(rows[2].selected, false);
});

test('prefere o formato "DIA:" quando ele existe', () => {
  const { rows } = parseDocumentText('MÊS DE MAIO:\nDIA: 01/05/2026: lanche 12,50', {});
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].amount, 1250);
});

test('avisa quando o documento não tem lançamentos', () => {
  assert.throws(() => parseDocumentText('apenas um texto qualquer', {}), { status: 400 });
});
