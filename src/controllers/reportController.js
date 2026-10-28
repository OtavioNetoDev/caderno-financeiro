const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Card = require('../models/Card');
const CardCharge = require('../models/CardCharge');
const AppError = require('../utils/AppError');
const { spendingForMonth } = require('../services/cardService');
const report = require('../services/reportService');

const TYPES = ['income', 'expense', 'investment'];

// Só lançamentos confirmados e sem pagamento de fatura: as compras do cartão entram pela fatura.
function baseMatch(userId, start, end) {
  return {
    userId: new mongoose.Types.ObjectId(userId),
    deletedAt: null,
    status: 'confirmed',
    invoicePayment: { $ne: true },
    date: { $gte: start, $lt: end },
  };
}

async function loadCardData(userId) {
  const [cards, charges] = await Promise.all([
    Card.find({ userId, deletedAt: null }),
    CardCharge.find({ userId, deletedAt: null }),
  ]);
  return { cards, charges };
}

// Receitas, despesas, aportes e lucro dos últimos N meses (padrão 6), mês a mês.
async function monthly(req, res) {
  const end = report.assertMonth(req.query.end || report.currentMonth(), 'end');
  const months = report.monthsEndingAt(end, report.parseMonthCount(req.query.months));
  const start = report.monthBounds(months[0]).start;
  const until = report.monthBounds(end).end;

  const [rows, { cards, charges }] = await Promise.all([
    Transaction.aggregate([
      { $match: { ...baseMatch(req.userId, start, until), type: { $in: TYPES } } },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$date', timezone: report.TIMEZONE } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),
    loadCardData(req.userId),
  ]);

  const cardByMonth = Object.fromEntries(
    months.map((month) => [month, spendingForMonth(cards, charges, month).total]),
  );
  res.json(report.assembleMonthly(months, rows, cardByMonth));
}

// Movimento dia a dia de um mês (lançamentos nas contas; compras no cartão entram pela fatura).
async function daily(req, res) {
  const month = report.assertMonth(req.query.month);
  const { start, end } = report.monthBounds(month);
  const rows = await Transaction.aggregate([
    { $match: { ...baseMatch(req.userId, start, end), type: { $in: TYPES } } },
    {
      $group: {
        _id: {
          day: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: report.TIMEZONE } },
          type: '$type',
        },
        total: { $sum: '$amount' },
      },
    },
  ]);
  res.json(report.assembleDaily(month, rows));
}

const GROUPS = {
  category: '$categoryId',
  account: '$accountId',
  person: '$personName',
};

// Totais por categoria, conta, pessoa ou dia da semana. O cliente troca ids por nomes.
// `months` (padrão 1) soma os últimos N meses terminando em `month`.
async function breakdown(req, res) {
  const month = report.assertMonth(req.query.month);
  const by = req.query.by || 'category';
  const type = req.query.type || 'expense';
  if (!TYPES.includes(type)) {
    throw new AppError(400, 'type deve ser income, expense ou investment');
  }
  if (by !== 'weekday' && !GROUPS[by]) {
    throw new AppError(400, 'by deve ser category, account, person ou weekday');
  }
  const months = report.monthsEndingAt(month, report.parseMonthCount(req.query.months || '1'));
  const start = report.monthBounds(months[0]).start;
  const until = report.monthBounds(month).end;
  const match = { ...baseMatch(req.userId, start, until), type };
  if (by === 'person') {
    match.personName = { $ne: '' };
  }

  if (by === 'weekday') {
    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dayOfWeek: { date: '$date', timezone: report.TIMEZONE } },
          total: { $sum: '$amount' },
        },
      },
    ]);
    res.json({ month, months: months.length, by, type, items: report.assembleWeekdays(rows) });
    return;
  }

  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: GROUPS[by], total: { $sum: '$amount' } } },
  ]);
  const lists = [rows.map((row) => ({ key: row._id ? String(row._id) : null, total: row.total }))];

  // As compras do cartão também são despesa por categoria.
  if (by === 'category' && type === 'expense') {
    const { cards, charges } = await loadCardData(req.userId);
    for (const m of months) {
      lists.push(
        spendingForMonth(cards, charges, m).byCategory.map((item) => ({
          key: item.categoryId,
          total: item.total,
        })),
      );
    }
  }
  res.json({ month, months: months.length, by, type, items: report.mergeTotals(...lists) });
}

module.exports = { monthly, daily, breakdown };
