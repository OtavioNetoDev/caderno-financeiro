const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { computeBalances } = require('../services/accountBalanceService');

const FIELDS = ['name', 'type', 'initialBalance', 'archived'];

async function findOwned(req) {
  const account = await Account.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null,
  });
  if (!account) {
    throw new AppError(404, 'Conta não encontrada');
  }
  return account;
}

async function list(req, res) {
  const filter = { userId: req.userId, deletedAt: null };
  if (req.query.archived !== 'true') {
    filter.archived = false;
  }
  res.json(await Account.find(filter).sort({ name: 1 }));
}

// Saldo atual de cada conta e patrimônio total (contas não arquivadas).
async function balances(req, res) {
  const userId = new mongoose.Types.ObjectId(req.userId);
  const [accounts, rows] = await Promise.all([
    Account.find({ userId, deletedAt: null, archived: false }).sort({ name: 1 }),
    Transaction.aggregate([
      { $match: { userId, deletedAt: null } },
      {
        $group: {
          _id: {
            accountId: '$accountId',
            toAccountId: '$toAccountId',
            type: '$type',
            status: '$status',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);
  const groups = rows.map((row) => ({ ...row._id, total: row.total }));
  res.json(computeBalances(accounts, groups));
}

async function getOne(req, res) {
  res.json(await findOwned(req));
}

async function create(req, res) {
  const account = await Account.create({ ...pick(req.body, FIELDS), userId: req.userId });
  res.status(201).json(account);
}

async function update(req, res) {
  const account = await findOwned(req);
  account.set(pick(req.body, FIELDS));
  await account.save();
  res.json(account);
}

async function remove(req, res) {
  const account = await findOwned(req);
  account.deletedAt = new Date();
  await account.save();
  res.status(204).end();
}

module.exports = { list, balances, getOne, create, update, remove };
