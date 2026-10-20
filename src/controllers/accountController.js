const Account = require('../models/Account');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

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

module.exports = { list, getOne, create, update, remove };
