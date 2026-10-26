const AppError = require('../utils/AppError');
const { isValidParts } = require('../utils/day');
const { strip, classify, categoryFor, detectPerson } = require('./classifier');

const MAX_ROWS = 5000;
const DATE_RE = /^(data|date|dia)\b/;
const AMOUNT_RE = /^(valor|amount|value|quantia|montante)\b/;
const DESC_RE = /^(descri|historico|history|memo|lancamento|estabelecimento|detalhe|titulo|nome)/;
const TYPE_RE = /^(tipo|type|natureza)/;

const pad = (value) => String(value).padStart(2, '0');

function fromParts(year, month, day) {
  return isValidParts(year, month, day) ? `${year}-${pad(month)}-${pad(day)}` : null;
}

// "1.500,00" -> 150000 | "-12,50" -> -1250 | "(12,50)" -> -1250 | 12.5 -> 1250
function parseAmount(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value * 100) : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  let text = value.replace(/R\$|\s/g, '');
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1);
  }
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }
  if (!/^\d[\d.,]*$/.test(text)) {
    return null;
  }
  if (text.includes(',')) {
    text = text.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(text)) {
    text = text.replace(/\./g, '');
  }
  const number = Number(text);
  if (!Number.isFinite(number)) {
    return null;
  }
  const cents = Math.round(number * 100);
  return negative ? -cents : cents;
}

// Aceita Date (planilha), dd/mm/aaaa, dd-mm-aa e aaaa-mm-dd. Devolve AAAA-MM-DD ou null.
function parseDateCell(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return fromParts(value.getUTCFullYear(), value.getUTCMonth() + 1, value.getUTCDate());
  }
  const text = String(value ?? '').trim();
  let match = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})\b/.exec(text);
  if (match) {
    const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
    return fromParts(year, Number(match[2]), Number(match[1]));
  }
  match = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  return match ? fromParts(Number(match[1]), Number(match[2]), Number(match[3])) : null;
}

function detectSeparator(text) {
  const sample = text.split(/\r?\n/).slice(0, 10).join('\n');
  const counts = [';', ',', '\t'].map((separator) => [
    separator,
    sample.split(separator).length - 1,
  ]);
  counts.sort((a, b) => b[1] - a[1]);
  return counts[0][0];
}

function parseCsv(text) {
  const clean = String(text).replace(/^\uFEFF/, '');
  const separator = detectSeparator(clean);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < clean.length; index += 1) {
    const char = clean[index];
    if (quoted) {
      if (char === '"') {
        if (clean[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === separator) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && clean[index + 1] === '\n') {
        index += 1;
      }
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }
  if (cell !== '' || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function typeFromColumn(value) {
  const text = strip(value).trim();
  if (/(receita|credito|entrada|income|deposito)/.test(text)) return 'income';
  if (/(despesa|debito|saida|expense|compra|pagamento)/.test(text)) return 'expense';
  if (/invest/.test(text)) return 'investment';
  return null;
}

function findHeader(table) {
  for (let index = 0; index < Math.min(table.length, 15); index += 1) {
    const cols = (table[index] || []).map((cell) => strip(cell).trim());
    const date = cols.findIndex((col) => DATE_RE.test(col));
    const amount = cols.findIndex((col) => AMOUNT_RE.test(col));
    if (date >= 0 && amount >= 0 && date !== amount) {
      let desc = cols.findIndex((col) => DESC_RE.test(col));
      if (desc < 0) {
        desc = cols.findIndex((_, position) => position !== date && position !== amount);
      }
      return { index, date, amount, desc, type: cols.findIndex((col) => TYPE_RE.test(col)) };
    }
  }
  return null;
}

// Converte uma tabela (CSV ou planilha) em linhas de prévia. Valor negativo = despesa, positivo = receita.
function rowsFromTable(table, { people = [] } = {}) {
  const header = findHeader(table);
  if (!header) {
    throw new AppError(
      400,
      'Não encontrei as colunas "Data" e "Valor". Confira o cabeçalho do arquivo.',
    );
  }
  const rows = [];
  const ignored = [];

  for (let index = header.index + 1; index < table.length; index += 1) {
    const cells = table[index] || [];
    if (cells.every((cell) => cell === null || cell === undefined || String(cell).trim() === '')) {
      continue;
    }
    if (rows.length >= MAX_ROWS) {
      throw new AppError(400, `Arquivo com linhas demais (máximo de ${MAX_ROWS})`);
    }
    const date = parseDateCell(cells[header.date]);
    const signed = parseAmount(cells[header.amount]);
    if (!date || !signed) {
      ignored.push({
        line: index + 1,
        text: cells
          .map((cell) => String(cell ?? ''))
          .join(' ')
          .slice(0, 120),
        reason: !date ? 'data inválida' : 'valor inválido',
      });
      continue;
    }
    const description =
      String(cells[header.desc] ?? '')
        .trim()
        .slice(0, 200) || '(sem descrição)';
    let type =
      (header.type >= 0 && typeFromColumn(cells[header.type])) ||
      (signed < 0 ? 'expense' : 'income');
    if (classify(description).type === 'investment') {
      type = 'investment';
    }
    rows.push({
      line: index + 1,
      date,
      text: description,
      amount: Math.abs(signed),
      type,
      category: categoryFor(description, type),
      ...detectPerson(description, people),
      status: 'confirmed',
      confidence: 'high',
      flags: [],
      selected: true,
    });
  }
  return { rows, ignored };
}

module.exports = { parseAmount, parseDateCell, parseCsv, rowsFromTable };
