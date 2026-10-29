const Recurring = require('../models/Recurring');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const service = require('../services/recurringService');

const FIELDS = [
  'description',
  'amount',
  'type',
  'dayOfMonth',
  'startMonth',
  'endMonth',
  'status',
  'categoryId',
  'accountId',
  'active',
];

async function findOwned(req) {
  const recurring = await Recurring.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null,
  });
  if (!recurring) {
    throw new AppError(404, 'Recorrente não encontrado');
  }
  return recurring;
}

// Conta e categoria precisam existir e ser do usuário.
async function assertReferences(userId, data) {
  const checks = [
    ['accountId', Account],
    ['categoryId', Category],
  ];
  for (const [field, Model] of checks) {
    if (data[field] && !(await Model.exists({ _id: data[field], userId, deletedAt: null }))) {
      throw new AppError(400, `${field} não encontrado`);
    }
  }
}

async function list(req, res) {
  res.json(await Recurring.find({ userId: req.userId, deletedAt: null }).sort({ description: 1 }));
}

async function create(req, res) {
  const data = service.validateRecurring(pick(req.body, FIELDS));
  await assertReferences(req.userId, data);
  const recurring = await Recurring.create({ ...data, userId: req.userId });
  res.status(201).json(recurring);
}

// Aceita edição parcial (ex.: só { active: false } para pausar): o que não vem é mantido.
async function update(req, res) {
  const recurring = await findOwned(req);
  const current = pick(recurring.toObject(), FIELDS);
  const data = service.validateRecurring({ ...current, ...pick(req.body, FIELDS) });
  await assertReferences(req.userId, data);
  recurring.set(data);
  await recurring.save();
  res.json(recurring);
}

async function remove(req, res) {
  const recurring = await findOwned(req);
  recurring.deletedAt = new Date();
  await recurring.save();
  res.status(204).end();
}

// Cria os lançamentos do mês para os recorrentes ativos que ainda não têm um.
async function generate(req, res) {
  const month = req.body && req.body.month;
  if (!service.MONTH_RE.test(month || '')) {
    throw new AppError(400, 'Informe month no formato AAAA-MM');
  }
  const [recurrings, accounts, already] = await Promise.all([
    Recurring.find({ userId: req.userId, deletedAt: null, active: true }),
    Account.find({ userId: req.userId, deletedAt: null }).select('_id'),
    // Inclui os excluídos: o lançamento apagado de propósito não volta sozinho.
    Transaction.find({
      userId: req.userId,
      recurringMonth: month,
      recurringId: { $ne: null },
    }).select('recurringId recurringMonth'),
  ]);
  const existing = new Set(already.map((item) => `${item.recurringId}|${item.recurringMonth}`));
  const accountIds = new Set(accounts.map((item) => String(item._id)));
  const plan = service.planGeneration(recurrings, month, existing, accountIds);

  try {
    if (plan.toCreate.length) {
      await Transaction.insertMany(
        plan.toCreate.map((item) => ({ ...item, userId: req.userId })),
        { ordered: false },
      );
    }
  } catch (err) {
    if (err && err.code === 11000) {
      throw new AppError(409, 'Alguns lançamentos já tinham sido gerados. Atualize a tela.');
    }
    throw err;
  }
  res.json({
    month,
    created: plan.toCreate.length,
    alreadyExisted: plan.alreadyExisted,
    missingAccount: plan.missingAccount,
  });
}

module.exports = { list, create, update, remove, generate };
