const { test } = require('node:test');
const assert = require('node:assert');
const { parseAmount, parseDateCell, parseCsv, rowsFromTable } = require('../src/importers/table');
const { decodeText } = require('../src/importers');

test('converte textos e números em centavos', () => {
  assert.strictEqual(parseAmount('1.500,00'), 150000);
  assert.strictEqual(parseAmount('-12,50'), -1250);
  assert.strictEqual(parseAmount('R$ 12,50'), 1250);
  assert.strictEqual(parseAmount('(12,50)'), -1250);
  assert.strictEqual(parseAmount('1.234'), 123400);
  assert.strictEqual(parseAmount('12.5'), 1250);
  assert.strictEqual(parseAmount(12.5), 1250);
  assert.strictEqual(parseAmount('abc'), null);
  assert.strictEqual(parseAmount(''), null);
});

test('lê datas em vários formatos e recusa as impossíveis', () => {
  assert.strictEqual(parseDateCell('02/10/2026'), '2026-10-02');
  assert.strictEqual(parseDateCell('2/10/26'), '2026-10-02');
  assert.strictEqual(parseDateCell('2026-10-02'), '2026-10-02');
  assert.strictEqual(parseDateCell(new Date(Date.UTC(2026, 9, 2))), '2026-10-02');
  assert.strictEqual(parseDateCell('31/02/2026'), null);
  assert.strictEqual(parseDateCell('ontem'), null);
});

test('lê CSV com ponto e vírgula e aspas', () => {
  const rows = parseCsv('Data;Descrição;Valor\n02/10/2026;"Lanche; com Maria";-12,50\n');
  assert.deepStrictEqual(rows, [
    ['Data', 'Descrição', 'Valor'],
    ['02/10/2026', 'Lanche; com Maria', '-12,50'],
  ]);
});

test('converte uma tabela em linhas de prévia', () => {
  const table = [
    ['Extrato de outubro'],
    ['Data', 'Descrição', 'Valor'],
    ['02/10/2026', 'Salário', '1.500,00'],
    ['03/10/2026', 'Açaí com Maria', '-12,50'],
    ['', '', ''],
    ['31/02/2026', 'Data impossível', '10,00'],
    ['05/10/2026', 'Sem valor', ''],
  ];
  const { rows, ignored } = rowsFromTable(table, { people: ['Maria'] });
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(ignored.length, 2);
  assert.deepStrictEqual(
    [rows[0].date, rows[0].amount, rows[0].type, rows[0].category],
    ['2026-10-02', 150000, 'income', 'Salário'],
  );
  assert.deepStrictEqual(
    [rows[1].amount, rows[1].type, rows[1].category, rows[1].personName, rows[1].shareMode],
    [1250, 'expense', 'Lanche', 'Maria', 'with'],
  );
});

test('avisa quando não há cabeçalho com Data e Valor', () => {
  assert.throws(
    () =>
      rowsFromTable([
        ['a', 'b'],
        ['1', '2'],
      ]),
    { status: 400 },
  );
});

test('decodifica UTF-8 e Windows-1252 e recusa binários', () => {
  assert.strictEqual(decodeText(Buffer.from('ação', 'utf8')), 'ação');
  assert.strictEqual(decodeText(Buffer.from('a\xe7\xe3o', 'latin1')), 'ação');
  assert.throws(() => decodeText(Buffer.from([0x50, 0x4b, 0x00, 0x01])), { status: 400 });
});
