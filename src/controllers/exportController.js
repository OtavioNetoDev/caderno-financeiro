const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Card = require('../models/Card');
const CardCharge = require('../models/CardCharge');
const Category = require('../models/Category');
const Debt = require('../models/Debt');
const Investment = require('../models/Investment');
const Note = require('../models/Note');
const Transaction = require('../models/Transaction');
const { toCsv } = require('../utils/csv');

const TYPE = {
  expense: 'Despesa',
  income: 'Receita',
  investment: 'Investimento',
  transfer: 'Transferência',
};
const SHARE = { with: 'com', for: 'de' };
const HEADERS = [
  'Data',
  'Tipo',
  'Valor',
  'Descrição',
  'Categoria',
  'Conta',
  'Status',
  'Pessoa',
  'Com/De',
  'Observações',
];

const formatDate = (value) =>
  new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });
const formatMoney = (cents) => (cents / 100).toFixed(2).replace('.', ',');

async function transactionsCsv(req, res) {
  const filter = { userId: req.userId, deletedAt: null };
  const { from, to } = req.query;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const [transactions, categories, accounts] = await Promise.all([
    Transaction.find(filter).sort({ date: 1 }).lean(),
    Category.find({ userId: req.userId }).lean(),
    Account.find({ userId: req.userId }).lean(),
  ]);
  const categoryNames = new Map(categories.map((item) => [String(item._id), item.name]));
  const accountNames = new Map(accounts.map((item) => [String(item._id), item.name]));

  const rows = transactions.map((item) => [
    formatDate(item.date),
    TYPE[item.type] || item.type,
    formatMoney(item.amount),
    item.description,
    categoryNames.get(String(item.categoryId)),
    accountNames.get(String(item.accountId)),
    item.status === 'pending' ? 'Pendente' : 'Confirmado',
    item.personName,
    SHARE[item.shareMode] || '',
    item.notes,
  ]);

  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': 'attachment; filename="lancamentos.csv"',
  });
  res.send(toCsv(HEADERS, rows));
}

// Cópia de todos os dados do usuário (sem senha nem códigos de recuperação).
async function backup(req, res) {
  const own = { userId: req.userId };
  const [
    accounts,
    categories,
    transactions,
    debts,
    investments,
    notes,
    cards,
    cardCharges,
    budgets,
  ] = await Promise.all([
    Account.find(own).lean(),
    Category.find(own).lean(),
    Transaction.find(own).lean(),
    Debt.find(own).lean(),
    Investment.find(own).lean(),
    Note.find(own).lean(),
    Card.find(own).lean(),
    CardCharge.find(own).lean(),
    Budget.find(own).lean(),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  res.set({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Disposition': `attachment; filename="caderno-financeiro-backup-${stamp}.json"`,
  });
  res.send(
    JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        user: { name: req.user.name, email: req.user.email },
        accounts,
        categories,
        transactions,
        debts,
        investments,
        notes,
        cards,
        cardCharges,
        budgets,
      },
      null,
      2,
    ),
  );
}

module.exports = { transactionsCsv, backup };
