const Debt = require('../models/Debt');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { applyEntry, summarize } = require('../services/debtService');

const CREATE_FIELDS = ['personName', 'direction', 'originalAmount', 'dueDate', 'notes'];
const UPDATE_FIELDS = ['personName', 'dueDate', 'notes'];

async function findOwned(req) {
  const debt = await Debt.findOne({ _id: req.params.id, userId: req.userId, deletedAt: null });
  if (!debt) {
    throw new AppError(404, 'Dívida não encontrada');
  }
  return debt;
}

async function list(req, res) {
  const filter = { userId: req.userId, deletedAt: null };
  for (const key of ['direction', 'status']) {
    if (req.query[key]) {
      filter[key] = req.query[key];
    }
  }
  res.json(await Debt.find(filter).sort({ status: 1, updatedAt: -1 }));
}

async function getOne(req, res) {
  res.json(await findOwned(req));
}

async function create(req, res) {
  const debt = await Debt.create({ ...pick(req.body, CREATE_FIELDS), userId: req.userId });
  res.status(201).json(debt);
}

async function update(req, res) {
  const debt = await findOwned(req);
  debt.set(pick(req.body, UPDATE_FIELDS));
  await debt.save();
  res.json(debt);
}

async function remove(req, res) {
  const debt = await findOwned(req);
  debt.deletedAt = new Date();
  await debt.save();
  res.status(204).end();
}

async function addEntry(req, res) {
  const debt = await findOwned(req);
  const entry = pick(req.body, ['kind', 'amount', 'date', 'notes']);
  if (!['payment', 'increase'].includes(entry.kind)) {
    throw new AppError(400, 'Tipo de movimentação inválido');
  }
  entry.date = entry.date ? new Date(entry.date) : new Date();
  const error = applyEntry(debt, entry);
  if (error) {
    throw new AppError(400, error);
  }
  await debt.save();
  res.status(201).json(debt);
}

async function summary(req, res) {
  const debts = await Debt.find({ userId: req.userId, deletedAt: null, status: 'open' });
  res.json(summarize(debts));
}

module.exports = { list, getOne, create, update, remove, addEntry, summary };
