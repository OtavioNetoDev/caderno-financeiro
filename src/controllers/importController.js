const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { EXTENSIONS, parseFile } = require('../importers');
const { markDuplicates } = require('../services/importService');
const { findExistingTransactions } = require('../services/importQueries');

const MAX_ROWS = 2000;

// Lê o arquivo e devolve a prévia. Nada é salvo aqui.
async function preview(req, res) {
  if (!req.file) {
    throw new AppError(400, 'Envie um arquivo');
  }
  const known = await Transaction.distinct('personName', {
    userId: req.userId,
    deletedAt: null,
    personName: { $ne: '' },
  });
  const typed = String((req.body && req.body.people) || '')
    .split(',')
    .map((name) => name.trim());
  const people = [...new Set([...typed, ...known])]
    .filter((name) => name && name.length <= 60)
    .slice(0, 50);

  const result = await parseFile(req.file, { people });
  if (result.rows.length > MAX_ROWS) {
    throw new AppError(400, `Arquivo com linhas demais (máximo de ${MAX_ROWS})`);
  }

  const existing = await findExistingTransactions(
    req.userId,
    result.rows.map((row) => row.date),
  );
  const rows = markDuplicates(result.rows, existing).map((row) =>
    row.duplicate ? { ...row, selected: false, flags: [...row.flags, 'duplicado'] } : row,
  );
  res.json({
    format: result.format,
    rows,
    ignored: result.ignored.slice(0, 50),
    ignoredCount: result.ignored.length,
  });
}

function formats(req, res) {
  res.json({ extensions: Object.keys(EXTENSIONS) });
}

module.exports = { preview, formats };
