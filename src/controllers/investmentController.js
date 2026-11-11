const Investment = require('../models/Investment');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { applyEntry, present, summarize, incomeReport } = require('../services/investmentService');
const {
  portfolio: buildPortfolio,
  tickerOf,
  MARKET_TYPES,
} = require('../services/portfolioService');
const { getQuotes } = require('../services/quotesService');
const { getCdi } = require('../services/ratesService');

// Cotações e CDI vêm da internet: a tela espera no máximo isso por elas.
const EXTERNAL_WAIT_MS = 2500;

const CREATE_FIELDS = [
  'name',
  'type',
  'annualRate',
  'cdiPercent',
  'dailyGain',
  'personName',
  'notes',
  'currentValue',
  'currentValueDate',
  'ticker',
  'monthlyIncomePerShare',
];
const UPDATE_FIELDS = [
  'name',
  'type',
  'annualRate',
  'cdiPercent',
  'dailyGain',
  'personName',
  'notes',
  'currentValue',
  'currentValueDate',
  'ticker',
  'monthlyIncomePerShare',
  'archived',
];

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

// Proventos recebidos no período (?from=...&to=...), separados das receitas.
async function income(req, res) {
  const range = {};
  for (const key of ['from', 'to']) {
    if (req.query[key]) {
      const date = new Date(req.query[key]);
      if (Number.isNaN(date.getTime())) {
        throw new AppError(400, 'Data inválida em "' + key + '"');
      }
      range[key] = date;
    }
  }
  if (['market', 'fixed'].includes(req.query.group)) {
    range.group = req.query.group;
  }
  const investments = await Investment.find({ userId: req.userId, deletedAt: null });
  res.json(incomeReport(investments, range));
}

// Carteira por tipo: totais, valor atual estimado (CDI do Banco Central) e histórico.
async function portfolio(req, res) {
  const investments = await Investment.find({ userId: req.userId, deletedAt: null });
  const tickers = investments
    .filter((item) => MARKET_TYPES.includes(item.type) && !item.archived && !item.personName)
    .map((item) => tickerOf(item))
    .filter(Boolean);
  // CDI e cotações vêm da internet: buscam juntos e a tela espera no máximo o prazo.
  // O que não chegar a tempo fica guardado para a próxima abertura.
  const [rates, quotes] = await Promise.all([
    getCdi({ waitMs: EXTERNAL_WAIT_MS }),
    getQuotes(tickers, { waitMs: EXTERNAL_WAIT_MS }),
  ]);
  res.json({ ...buildPortfolio(investments, { cdi: rates.annual, quotes }), cdi: rates });
}

module.exports = {
  portfolio,
  list,
  getOne,
  create,
  update,
  remove,
  addEntry,
  removeEntry,
  summary,
  income,
};
