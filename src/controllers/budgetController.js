const mongoose = require('mongoose');
const Budget = require('../models/Budget');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { statusOf } = require('../services/budgetService');

async function status(req, res) {
  const { month } = req.query;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) {
    throw new AppError(400, 'Informe month no formato AAAA-MM');
  }
  const [year, mon] = month.split('-').map(Number);
  // America/Bahia = UTC-3: o mês começa às 03:00 UTC.
  const start = new Date(Date.UTC(year, mon - 1, 1, 3));
  const end = new Date(Date.UTC(year, mon, 1, 3));
  const userId = new mongoose.Types.ObjectId(req.userId);

  const [budgets, spentRows] = await Promise.all([
    Budget.find({ userId }),
    Transaction.aggregate([
      {
        $match: {
          userId,
          type: 'expense',
          status: 'confirmed',
          deletedAt: null,
          categoryId: { $ne: null },
          date: { $gte: start, $lt: end },
        },
      },
      { $group: { _id: '$categoryId', total: { $sum: '$amount' } } },
    ]),
  ]);

  const spent = new Map(spentRows.map((row) => [String(row._id), row.total]));
  const categories = await Category.find({
    _id: { $in: budgets.map((budget) => budget.categoryId) },
  });
  const names = new Map(categories.map((category) => [String(category._id), category.name]));

  const items = budgets.map((budget) => {
    const key = String(budget.categoryId);
    const used = spent.get(key) || 0;
    return {
      categoryId: key,
      categoryName: names.get(key) || 'Categoria removida',
      limitAmount: budget.limitAmount,
      spent: used,
      ...statusOf(budget.limitAmount, used),
    };
  });
  items.sort((a, b) => b.percent - a.percent);
  res.json(items);
}

async function upsert(req, res) {
  const limitAmount = req.body ? req.body.limitAmount : undefined;
  if (!Number.isInteger(limitAmount) || limitAmount < 1) {
    throw new AppError(400, 'Informe limitAmount como inteiro em centavos, maior que zero');
  }
  const owned = {
    _id: req.params.categoryId,
    userId: req.userId,
    deletedAt: null,
    kind: 'expense',
  };
  if (!(await Category.exists(owned))) {
    throw new AppError(400, 'Categoria de despesa não encontrada');
  }
  const budget = await Budget.findOneAndUpdate(
    { userId: req.userId, categoryId: req.params.categoryId },
    { limitAmount },
    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
  );
  res.json(budget);
}

async function remove(req, res) {
  await Budget.deleteOne({ userId: req.userId, categoryId: req.params.categoryId });
  res.status(204).end();
}

module.exports = { status, upsert, remove };
