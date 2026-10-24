const { isValidParts } = require('../utils/day');
const { extractAmount } = require('./amount');
const { strip, classify, detectPerson } = require('./classifier');

const MONTHS = {
  janeiro: 1,
  fevereiro: 2,
  marco: 3,
  abril: 4,
  maio: 5,
  junho: 6,
  julho: 7,
  agosto: 8,
  setembro: 9,
  outubro: 10,
  novembro: 11,
  dezembro: 12,
};
const SECTION_RE = /^mes de ([a-z]+)\s*:?$/;
const ENTRY_RE = /^dia\s*:?\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*:?\s*(.*)$/i;
const pad = (value) => String(value).padStart(2, '0');

function buildRow({ line, date, month, text, section, people }) {
  const amount = extractAmount(text);
  const { type, category, flags } = classify(text);
  const rowFlags = [...flags];
  let confidence = amount.confidence;

  if (amount.cents === null) {
    rowFlags.push('sem valor');
  }
  if (amount.count > 1) {
    rowFlags.push('vários valores');
  }
  if (section && month !== section) {
    rowFlags.push('data fora da seção');
    confidence = 'low';
  }
  return {
    line,
    date,
    text: text.slice(0, 200),
    amount: amount.cents,
    type,
    category,
    ...detectPerson(text, people),
    status: 'confirmed',
    confidence,
    flags: rowFlags,
    selected: confidence === 'high' && !rowFlags.includes('dívida'),
  };
}

// Lê anotações no formato "DIA: dd/mm/aaaa: texto ||| outro texto", com seções "MÊS DE ...".
function parseText(text, { people = [] } = {}) {
  const rows = [];
  const ignored = [];
  let section = null;

  String(text)
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();
      if (!line) {
        return;
      }
      const lineNumber = index + 1;

      const header = SECTION_RE.exec(strip(line));
      if (header) {
        section = MONTHS[header[1]] || null;
        return;
      }

      const entry = ENTRY_RE.exec(line);
      if (!entry) {
        ignored.push({
          line: lineNumber,
          text: line.slice(0, 120),
          reason: 'linha não reconhecida',
        });
        return;
      }
      const [, dayText, monthText, yearText, rest] = entry;
      const day = Number(dayText);
      const month = Number(monthText);
      const year = Number(yearText);
      if (!isValidParts(year, month, day)) {
        ignored.push({ line: lineNumber, text: line.slice(0, 120), reason: 'data inválida' });
        return;
      }

      const segments = rest
        .split(/\s*\|\|\|\s*/)
        .map((segment) => segment.trim())
        .filter(Boolean);
      if (!segments.length) {
        ignored.push({ line: lineNumber, text: line.slice(0, 120), reason: 'sem conteúdo' });
        return;
      }
      const date = `${year}-${pad(month)}-${pad(day)}`;
      for (const segment of segments) {
        rows.push(buildRow({ line: lineNumber, date, month, text: segment, section, people }));
      }
    });

  return { rows, ignored };
}

module.exports = { parseText };
