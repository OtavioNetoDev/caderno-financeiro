const path = require('path');
const AppError = require('../utils/AppError');
const { parseText } = require('./textParser');
const { parseCsv, rowsFromTable } = require('./table');

function decodeText(buffer) {
  if (buffer.includes(0)) {
    throw new AppError(400, 'O arquivo não parece ser de texto');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1252').decode(buffer);
  }
}

const IMPORTERS = {
  txt: {
    extensions: ['.txt'],
    parse: async (buffer, options) => parseText(decodeText(buffer), options),
  },
  csv: {
    extensions: ['.csv'],
    parse: async (buffer, options) => rowsFromTable(parseCsv(decodeText(buffer)), options),
  },
};

const EXTENSIONS = Object.fromEntries(
  Object.entries(IMPORTERS).flatMap(([format, item]) =>
    item.extensions.map((extension) => [extension, format]),
  ),
);

const formatOf = (fileName) => EXTENSIONS[path.extname(String(fileName)).toLowerCase()] || null;

async function parseFile(file, options = {}) {
  const format = formatOf(file.originalname);
  if (!format) {
    throw new AppError(400, `Formato não suportado. Use: ${Object.keys(EXTENSIONS).join(', ')}`);
  }
  const result = await IMPORTERS[format].parse(file.buffer, options);
  if (!result.rows.length) {
    throw new AppError(400, 'Não reconheci nenhum lançamento neste arquivo');
  }
  return { format, ...result };
}

module.exports = { EXTENSIONS, FORMATS: Object.keys(IMPORTERS), formatOf, decodeText, parseFile };
