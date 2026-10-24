const Card = require('../models/Card');
const CardCharge = require('../models/CardCharge');
const Account = require('../models/Account');
const Category = require('../models/Category');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { MONTH_RE, buildInvoice, dueMonth } = require('../services/cardService');

const CREATE_FIELDS = ['name', 'closingDay', 'dueDay', 'creditLimit'];
const UPDATE_FIELDS = [...CREATE_FIELDS, 'archived'];
const CHARGE_FIELDS = [
  'description',
  'amount',
  'installments',
  'purchaseDate',
  'categoryId',
  'personName',
  'notes',
];

async function findCard(req) {
  const card = await Card.findOne({ _id: req.params.id, userId: req.userId, deletedAt: null });
  if (!card) {
    throw new AppError(404, 'Cartão não encontrado');
  }
  return card;
}

function checkMonth(month) {
  if (!MONTH_RE.test(month)) {
    throw new AppError(400, 'Mês deve estar no formato AAAA-MM');
  }
}

function invoiceRecord(card, month) {
  let record = card.invoices.find((item) => item.month === month);
  if (!record) {
    card.invoices.push({ month });
    record = card.invoices[card.invoices.length - 1];
  }
  return record;
}

async function loadInvoice(card, month, userId) {
  const charges = await CardCharge.find({ userId, cardId: card._id, deletedAt: null });
  const invoice = buildInvoice(charges, card.closingDay, month);
  const saved = card.invoices.find((item) => item.month === month);
  const billed = saved && saved.billedTotal != null ? saved.billedTotal : null;
  return {
    ...invoice,
    closingDay: card.closingDay,
    dueDay: card.dueDay,
    dueMonth: dueMonth(month, card.closingDay, card.dueDay),
    billedTotal: billed,
    difference: billed === null ? null : billed - invoice.total,
    paid: Boolean(saved && saved.paid),
    paidAmount: saved ? saved.paidAmount : null,
  };
}

async function list(req, res) {
  res.json(
    await Card.find({ userId: req.userId, deletedAt: null, archived: false }).sort({ name: 1 }),
  );
}

async function create(req, res) {
  const card = await Card.create({ ...pick(req.body, CREATE_FIELDS), userId: req.userId });
  res.status(201).json(card);
}

async function update(req, res) {
  const card = await findCard(req);
  card.set(pick(req.body, UPDATE_FIELDS));
  await card.save();
  res.json(card);
}

async function remove(req, res) {
  const card = await findCard(req);
  card.deletedAt = new Date();
  await card.save();
  res.status(204).end();
}

async function listCharges(req, res) {
  const card = await findCard(req);
  res.json(
    await CardCharge.find({ userId: req.userId, cardId: card._id, deletedAt: null }).sort({
      purchaseDate: -1,
    }),
  );
}

async function createCharge(req, res) {
  const card = await findCard(req);
  const data = pick(req.body, CHARGE_FIELDS);
  if (!data.categoryId) {
    delete data.categoryId;
  } else if (
    !(await Category.exists({ _id: data.categoryId, userId: req.userId, deletedAt: null }))
  ) {
    throw new AppError(400, 'Categoria não encontrada');
  }
  const charge = await CardCharge.create({ ...data, userId: req.userId, cardId: card._id });
  res.status(201).json(charge);
}

async function removeCharge(req, res) {
  const card = await findCard(req);
  const charge = await CardCharge.findOne({
    _id: req.params.chargeId,
    userId: req.userId,
    cardId: card._id,
    deletedAt: null,
  });
  if (!charge) {
    throw new AppError(404, 'Compra não encontrada');
  }
  charge.deletedAt = new Date();
  await charge.save();
  res.status(204).end();
}

async function getInvoice(req, res) {
  const card = await findCard(req);
  checkMonth(req.params.month);
  res.json(await loadInvoice(card, req.params.month, req.userId));
}

// Guarda o valor informado pelo banco (ou null para limpar) e mostra a diferença para o cálculo.
async function setBilled(req, res) {
  const card = await findCard(req);
  const { month } = req.params;
  checkMonth(month);
  const value = req.body ? req.body.billedTotal : undefined;
  if (value === undefined) {
    throw new AppError(400, 'Informe billedTotal em centavos, ou null para limpar');
  }
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    throw new AppError(400, 'billedTotal deve ser um inteiro em centavos');
  }
  invoiceRecord(card, month).billedTotal = value;
  await card.save();
  res.json(await loadInvoice(card, month, req.userId));
}

// Pagar a fatura cria uma despesa na conta escolhida e marca a fatura como paga (uma vez só).
async function payInvoice(req, res) {
  const card = await findCard(req);
  const { month } = req.params;
  checkMonth(month);
  const invoice = await loadInvoice(card, month, req.userId);
  if (invoice.paid) {
    throw new AppError(409, 'Esta fatura já foi paga');
  }

  const { accountId, amount } = pick(req.body, ['accountId', 'amount']);
  const value = amount === undefined ? (invoice.billedTotal ?? invoice.total) : amount;
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError(400, 'Não há valor a pagar nesta fatura');
  }
  if (
    !accountId ||
    !(await Account.exists({ _id: accountId, userId: req.userId, deletedAt: null }))
  ) {
    throw new AppError(400, 'Conta de pagamento não encontrada');
  }

  const transaction = await Transaction.create({
    userId: req.userId,
    type: 'expense',
    amount: value,
    date: new Date(),
    description: `Fatura ${card.name} ${month}`,
    accountId,
    status: 'confirmed',
    paymentMethod: 'transfer',
  });
  const record = invoiceRecord(card, month);
  record.paid = true;
  record.paidAmount = value;
  record.transactionId = transaction._id;
  await card.save();
  res.status(201).json(await loadInvoice(card, month, req.userId));
}

module.exports = {
  list,
  create,
  update,
  remove,
  listCharges,
  createCharge,
  removeCharge,
  getInvoice,
  setBilled,
  payInvoice,
};
