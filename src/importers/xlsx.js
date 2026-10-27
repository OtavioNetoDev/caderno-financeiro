const ExcelJS = require('exceljs');
const AppError = require('../utils/AppError');
const { rowsFromTable } = require('./table');

const MAX_SHEET_ROWS = 10000;

function cellValue(value) {
  if (value === null || value === undefined || value instanceof Date) {
    return value ?? null;
  }
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text).join('');
    }
    if (value.result !== undefined) {
      return cellValue(value.result);
    }
    if (value.text !== undefined) {
      return String(value.text);
    }
    return null;
  }
  return value;
}

async function parseXlsx(buffer, options = {}) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new AppError(400, 'Não foi possível abrir a planilha');
  }
  const sheet = workbook.worksheets.find((item) => item.rowCount > 0);
  if (!sheet) {
    throw new AppError(400, 'A planilha está vazia');
  }
  if (sheet.rowCount > MAX_SHEET_ROWS) {
    throw new AppError(400, `Planilha com linhas demais (máximo de ${MAX_SHEET_ROWS})`);
  }
  const table = [];
  sheet.eachRow({ includeEmpty: true }, (row) => {
    table.push(Array.from(row.values.slice(1), cellValue));
  });
  return rowsFromTable(table, options);
}

module.exports = { parseXlsx };
