const Investment = require('../models/Investment');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { applyEntry, present, summarize } = require('../services/investmentService');

const CREATE_FIELDS = ['name', 'type', 'annualRate', 'notes'];
const UPDATE_FIELDS = ['name', 'type', 'annualRate', 'notes', 'archived'];

async function findOwned(req) {
  const investment = await Investment.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null,
  });
  if (!investment) {
    throw new AppError(404, 'Investimento não encontrado');
  }
  return investment;
}

async function list(req, res) {
  const filter = { userId: req.userId, deletedAt: null };
  if (req.query.archived !== 'true') {
    filter.archived = false;
  }
  const items = await Investment.find(filter).sort({ name: 1 });
  res.json(items.map(present));
}

async function getOne(req, res) {
  res.json(present(await findOwned(req)));
}

async function create(req, res) {
  const investment = await Investment.create({
    ...pick(req.body, CREATE_FIELDS),
    userId: req.userId,
  });
  res.status(201).json(present(investment));
}

async function update(req, res) {
  const investment = await findOwned(req);
  investment.set(pick(req.body, UPDATE_FIELDS));
  await investment.save();
  res.json(present(investment));
}

async function remove(req, res) {
  const investment = await findOwned(req);
  investment.deletedAt = new Date();
  await investment.save();
  res.status(204).end();
}

async function addEntry(req, res) {
  const investment = await findOwned(req);
  const entry = pick(req.body, ['kind', 'amount', 'date', 'quantity', 'notes']);
  entry.date = entry.date ? new Date(entry.date) : new Date();
  const error = applyEntry(investment, entry);
  if (error) {
    throw new AppError(400, error);
  }
  await investment.save();
  res.status(201).json(present(investment));
}

async function removeEntry(req, res) {
  const investment = await findOwned(req);
  if (!investment.entries.id(req.params.entryId)) {
    throw new AppError(404, 'Movimentação não encontrada');
  }
  investment.entries.pull(req.params.entryId);
  await investment.save();
  res.json(present(investment));
}

async function summary(req, res) {
  const investments = await Investment.find({ userId: req.userId, deletedAt: null });
  res.json(summarize(investments));
}

module.exports = { list, getOne, create, update, remove, addEntry, removeEntry, summary };
