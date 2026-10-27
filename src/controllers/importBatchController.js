const mongoose = require('mongoose');
const Account = require('../models/Account');
const Category = require('../models/Category');
const ImportBatch = require('../models/ImportBatch');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { FORMATS } = require('../importers');
const { markDuplicates, validateRow } = require('../services/importService');
const { findExistingTransactions } = require('../services/importQueries');

const MAX_ROWS = 2000;
const cleanName = (name) =>
  String(name || 'arquivo')
    .replace(/\p{Cc}/gu, '')
    .slice(0, 120);

async function confirm(req, res) {
  const { accountId, rows, fileName, format, allowDuplicates } = req.body || {};

  if (
    !mongoose.isValidObjectId(accountId) ||
    !(await Account.exists({ _id: accountId, userId: req.userId, deletedAt: null }))
  ) {
    throw new AppError(400, 'Conta de destino não encontrada');
  }
  if (!FORMATS.includes(format)) {
    throw new AppError(400, 'Formato inválido');
  }
  if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_ROWS) {
    throw new AppError(400, `Envie de 1 a ${MAX_ROWS} lançamentos`);
  }

  const problems = [];
  rows.forEach((row, index) => {
    const error = validateRow(row);
    if (error) {
      problems.push(`linha ${index + 1}: ${error}`);
    }
  });
  const categoryIds = [...new Set(rows.map((row) => row && row.categoryId).filter(Boolean))];
  if (categoryIds.some((id) => !mongoose.isValidObjectId(id))) {
    throw new AppError(400, 'Categoria inválida');
  }
  const categories = await Category.find({
    _id: { $in: categoryIds },
    userId: req.userId,
    deletedAt: null,
  }).lean();
  const kindOf = new Map(categories.map((category) => [String(category._id), category.kind]));
  rows.forEach((row, index) => {
    if (row && row.categoryId && kindOf.get(String(row.categoryId)) !== row.type) {
      problems.push(`linha ${index + 1}: categoria incompatível com o tipo`);
    }
  });
  if (problems.length) {
    throw new AppError(400, 'Há lançamentos inválidos: ' + problems.slice(0, 3).join('; '));
  }

  const existing = await findExistingTransactions(
    req.userId,
    rows.map((row) => row.date),
  );
  const marked = allowDuplicates === true ? rows : markDuplicates(rows, existing);
  const fresh = marked.filter((row) => !row.duplicate);
  const skipped = rows.length - fresh.length;
  if (!fresh.length) {
    throw new AppError(409, 'Todos os lançamentos já existem no sistema (duplicados)');
  }

  const batch = await ImportBatch.create({
    userId: req.userId,
    fileName: cleanName(fileName),
    format,
    totalRows: rows.length,
    importedRows: fresh.length,
    skippedDuplicates: skipped,
  });
  try {
    await Transaction.insertMany(
      fresh.map((row) => ({
        userId: req.userId,
        type: row.type,
        amount: row.amount,
        date: new Date(row.date + 'T12:00:00-03:00'),
        description: row.description.trim(),
        categoryId: row.categoryId || undefined,
        accountId,
        status: row.status === 'pending' ? 'pending' : 'confirmed',
        personName: row.shareMode ? String(row.personName || '').trim() : '',
        shareMode: row.shareMode || undefined,
        importBatchId: batch._id,
      })),
    );
  } catch (err) {
    await Transaction.deleteMany({ userId: req.userId, importBatchId: batch._id });
    await ImportBatch.deleteOne({ _id: batch._id });
    throw err;
  }
  res
    .status(201)
    .json({ batchId: batch._id, importedRows: fresh.length, skippedDuplicates: skipped });
}

async function list(req, res) {
  res.json(await ImportBatch.find({ userId: req.userId }).sort({ createdAt: -1 }).limit(30));
}

// Desfaz o lote: os lançamentos importados vão para a lixeira (exclusão lógica).
async function undo(req, res) {
  const batch = await ImportBatch.findOne({ _id: req.params.id, userId: req.userId });
  if (!batch) {
    throw new AppError(404, 'Importação não encontrada');
  }
  if (batch.status === 'undone') {
    throw new AppError(409, 'Esta importação já foi desfeita');
  }
  const result = await Transaction.updateMany(
    { userId: req.userId, importBatchId: batch._id, deletedAt: null },
    { deletedAt: new Date() },
  );
  batch.status = 'undone';
  batch.undoneAt = new Date();
  await batch.save();
  res.json({ removed: result.modifiedCount });
}

module.exports = { confirm, list, undo };
