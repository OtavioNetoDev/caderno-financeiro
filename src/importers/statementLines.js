const AppError = require('../utils/AppError');
const { isValidParts, dayOf } = require('../utils/day');
const { classify, categoryFor, detectPerson } = require('./classifier');
const { parseAmount } = require('./table');
const { parseText } = require('./textParser');

const LINE_RE = /^(\d{2})\/(\d{2})(?:\/(\d{4}|\d{2}))?\s+(.+)$/;
const AMOUNT_RE = /(-?(?:\d{1,3}(?:\.\d{3})+|\d+),\d{2})\s*([CD])?\s*$/i;
const pad = (value) => String(value).padStart(2, '0');

// Linhas de extrato: "02/10/2026 DESCRIÇÃO 1.500,00 C" (C = crédito, D = débito, ou valor com sinal).
function parseStatementLines(text, { people = [], year } = {}) {
  const fallbackYear = year || Number(dayOf(new Date()).slice(0, 4));
  const rows = [];
  const ignored = [];

  String(text)
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = raw.trim();
      if (!line) {
        return;
      }
      const lineNumber = index + 1;
      const head = LINE_RE.exec(line);
      if (!head) {
        ignored.push({
          line: lineNumber,
          text: line.slice(0, 120),
          reason: 'linha não reconhecida',
        });
        return;
      }
      const yearText = head[3];
      const fullYear = yearText
        ? yearText.length === 2
          ? 2000 + Number(yearText)
          : Number(yearText)
        : fallbackYear;
      if (!isValidParts(fullYear, Number(head[2]), Number(head[1]))) {
        ignored.push({ line: lineNumber, text: line.slice(0, 120), reason: 'data inválida' });
        return;
      }
      const amountMatch = AMOUNT_RE.exec(head[4]);
      const cents = amountMatch ? Math.abs(parseAmount(amountMatch[1].replace(/^-/, '')) || 0) : 0;
      if (!amountMatch || !cents) {
        ignored.push({ line: lineNumber, text: line.slice(0, 120), reason: 'sem valor' });
        return;
      }

      const indicator = (amountMatch[2] || '').toUpperCase();
      const known = amountMatch[1].startsWith('-') || Boolean(indicator);
      let type = indicator === 'C' ? 'income' : 'expense';
      const description =
        head[4].slice(0, amountMatch.index).trim().slice(0, 200) || '(sem descrição)';
      if (classify(description).type === 'investment') {
        type = 'investment';
      }

      const flags = [];
      if (!known) flags.push('tipo a confirmar');
      if (!yearText) flags.push('ano assumido');
      const confidence = flags.length ? 'low' : 'high';

      rows.push({
        line: lineNumber,
        date: `${fullYear}-${pad(Number(head[2]))}-${pad(Number(head[1]))}`,
        text: description,
        amount: cents,
        type,
        category: categoryFor(description, type),
        ...detectPerson(description, people),
        status: 'confirmed',
        confidence,
        flags,
        selected: confidence === 'high',
      });
    });

  return { rows, ignored };
}

// Texto de documentos: tenta o formato "DIA: ..." e depois o de extrato.
function parseDocumentText(text, options = {}) {
  const notes = parseText(text, options);
  if (notes.rows.length) {
    return notes;
  }
  const statement = parseStatementLines(text, options);
  if (!statement.rows.length) {
    throw new AppError(
      400,
      'Não reconheci lançamentos neste documento. Use linhas com data e valor, como "02/10/2026 Descrição 12,50".',
    );
  }
  return statement;
}

module.exports = { parseStatementLines, parseDocumentText };
