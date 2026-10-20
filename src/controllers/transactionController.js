const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

const FIELDS = [
  'type',
  'amount',
  'date',
  'description',
  'categoryId',
  'accountId',
  'toAccountId',
  'status',
  'personId',
  'shareMode',
  'paymentMethod',
  'notes',
];

// Garante que contas e categorias informadas existem e pertencem ao usuário.
async function assertReferences(userId, data) {
  const checks = [
    ['accountId', Account],
    ['toAccountId', Account],
    ['categoryId', Category],
  ];
  for (const [field, Model] of checks) {
    if (data[field] && !(await Model.exists({ _id: data[field], userId, deletedAt: null }))) {
      throw new AppError(400, `${field} não encontrado`);
    }
  }
}

async function findOwned(req) {
  const transaction = await Transaction.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null,
  });
  if (!transaction) {
    throw new AppError(404, 'Lançamento não encontrado');
  }
  return transaction;
}

function buildFilter(userId, query) {
  const filter = { userId, deletedAt: null };
  for (const key of ['type', 'status', 'categoryId', 'accountId']) {
    if (query[key]) {
      filter[key] = query[key];
    }
  }
  if (query.from || query.to) {
    filter.date = {};
    if (query.from) filter.date.$gte = new Date(query.from);
    if (query.to) filter.date.$lte = new Date(query.to);
  }
  return filter;
}

async function list(req, res) {
  const filter = buildFilter(req.userId, req.query);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);

  const [items, total] = await Promise.all([
    Transaction.find(filter)
      .sort({ date: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Transaction.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
}

async function getOne(req, res) {
  res.json(await findOwned(req));
}

async function create(req, res) {
  const data = pick(req.body, FIELDS);
  await assertReferences(req.userId, data);
  const transaction = await Transaction.create({ ...data, userId: req.userId });
  res.status(201).json(transaction);
}

async function update(req, res) {
  const transaction = await findOwned(req);
  const data = pick(req.body, FIELDS);
  await assertReferences(req.userId, data);
  transaction.set(data);
  await transaction.save();
  res.json(transaction);
}

async function remove(req, res) {
  const transaction = await findOwned(req);
  transaction.deletedAt = new Date();
  await transaction.save();
  res.status(204).end();
}

// Resumo do mês: receitas, despesas, aportes, lucro e % investido (RN20).
async function summary(req, res) {
  const { month } = req.query;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
    throw new AppError(400, 'Informe month no formato AAAA-MM');
  }
  const [year, mon] = month.split('-').map(Number);
  // America/Bahia = UTC-3: o mês começa às 03:00 UTC.
  const start = new Date(Date.UTC(year, mon - 1, 1, 3));
  const end = new Date(Date.UTC(year, mon, 1, 3));

  const rows = await Transaction.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(req.userId),
        deletedAt: null,
        status: 'confirmed',
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);

  const totals = Object.fromEntries(rows.map((row) => [row._id, row.total]));
  const income = totals.income || 0;
  const expense = totals.expense || 0;
  const investment = totals.investment || 0;
  const investedPercent = income > 0 ? Math.round((investment / income) * 10000) / 100 : 0;

  res.json({ month, income, expense, investment, profit: income - expense, investedPercent });
}

module.exports = { list, getOne, create, update, remove, summary };
