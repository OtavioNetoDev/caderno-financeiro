const { test } = require('node:test');
const assert = require('node:assert');
const ExcelJS = require('exceljs');
const { parseXlsx } = require('../src/importers/xlsx');
const { assertSignature, formatOf } = require('../src/importers');

test('lê uma planilha com colunas Data, Descrição e Valor', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Extrato');
  sheet.addRow(['Data', 'Descrição', 'Valor']);
  sheet.addRow([new Date(Date.UTC(2026, 9, 2)), 'Salário', 1500]);
  sheet.addRow([new Date(Date.UTC(2026, 9, 3)), 'Lanche', -12.5]);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  const { rows } = await parseXlsx(buffer, {});
  assert.strictEqual(rows.length, 2);
  assert.deepStrictEqual(
    [rows[0].date, rows[0].amount, rows[0].type, rows[0].category],
    ['2026-10-02', 150000, 'income', 'Salário'],
  );
  assert.deepStrictEqual(
    [rows[1].amount, rows[1].type, rows[1].category],
    [1250, 'expense', 'Lanche'],
  );
});

test('lê datas e valores escritos como texto na planilha', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Extrato');
  sheet.addRow(['Data', 'Histórico', 'Valor']);
  sheet.addRow(['04/10/2026', 'Mercado', 'R$ -80,00']);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());

  const { rows } = await parseXlsx(buffer, {});
  assert.deepStrictEqual(
    [rows[0].date, rows[0].amount, rows[0].type, rows[0].category],
    ['2026-10-04', 8000, 'expense', 'Mercado'],
  );
});

test('recusa arquivo que não é uma planilha', async () => {
  await assert.rejects(parseXlsx(Buffer.from('isto não é um xlsx'), {}), { status: 400 });
});

test('confere o conteúdo do arquivo pela assinatura', () => {
  assert.doesNotThrow(() => assertSignature('xlsx', Buffer.from([0x50, 0x4b, 0x03, 0x04])));
  assert.doesNotThrow(() => assertSignature('pdf', Buffer.from('%PDF-1.7 ...')));
  assert.throws(() => assertSignature('xlsx', Buffer.from('texto qualquer')), { status: 400 });
  assert.throws(() => assertSignature('pdf', Buffer.from('PK..')), { status: 400 });
  assert.doesNotThrow(() => assertSignature('csv', Buffer.from('a;b')));
});

test('identifica o formato pela extensão, ignorando maiúsculas', () => {
  assert.strictEqual(formatOf('Extrato.XLSX'), 'xlsx');
  assert.strictEqual(formatOf('notas.txt'), 'txt');
  assert.strictEqual(formatOf('programa.exe'), null);
});
