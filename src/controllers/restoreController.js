const Account = require('../models/Account');
const Budget = require('../models/Budget');
const Card = require('../models/Card');
const CardCharge = require('../models/CardCharge');
const Category = require('../models/Category');
const Debt = require('../models/Debt');
const Investment = require('../models/Investment');
const Note = require('../models/Note');
const Recurring = require('../models/Recurring');
const Transaction = require('../models/Transaction');
const AppError = require('../utils/AppError');
const { parseBackup, classify, brokenReferences } = require('../services/restoreService');

const MODELS = {
  accounts: Account,
  categories: Category,
  cards: Card,
  recurring: Recurring,
  transactions: Transaction,
  cardCharges: CardCharge,
  budgets: Budget,
  debts: Debt,
  investments: Investment,
  notes: Note,
};

const MAX_DETAILS = 10;

function problem(res, details) {
  return res.status(400).json({ error: 'Não foi possível restaurar este backup', details });
}

// Monta o plano de cada coleção comparando o backup com o que já existe no banco.
async function buildPlan(collections, userId) {
  const plan = {};
  for (const [name, Model] of Object.entries(MODELS)) {
    const docs = collections[name];
    const found = await Model.find({ _id: { $in: docs.map((doc) => doc._id) } })
      .select('userId deletedAt')
      .lean();
    const existing = new Map(found.map((item) => [String(item._id), item]));

    let isDuplicate;
    if (name === 'budgets') {
      // Só pode haver uma meta por categoria.
      const own = await Budget.find({ userId }).select('categoryId').lean();
      const taken = new Set(own.map((item) => String(item.categoryId)));
      isDuplicate = (doc) => taken.has(String(doc.categoryId));
    }
    plan[name] = classify(docs, existing, userId, isDuplicate);
  }
  return plan;
}

// Confere cada item com as regras do sistema, sem gravar nada.
async function validateAll(plan, userId) {
  const errors = [];
  for (const [name, Model] of Object.entries(MODELS)) {
    for (const doc of [...plan[name].insert, ...plan[name].restore]) {
      try {
        await new Model({ ...doc, userId }).validate();
      } catch (err) {
        const reason = err.errors
          ? Object.values(err.errors)
              .map((item) => item.message)
              .join('; ')
          : err.message;
        errors.push(`${name}: ${reason}`);
      }
    }
  }
  return errors;
}

async function knownIds(plan, userId) {
  const known = {};
  for (const name of ['accounts', 'categories', 'cards']) {
    const own = await MODELS[name].find({ userId }).select('_id').lean();
    const ids = new Set(own.map((item) => String(item._id)));
    for (const doc of [...plan[name].insert, ...plan[name].restore]) {
      ids.add(String(doc._id));
    }
    known[name] = ids;
  }
  return known;
}

// Restaura o backup do próprio usuário. Nunca apaga nem sobrescreve o que já existe:
// só grava o que falta e traz de volta o que está na lixeira. Pode ser repetido sem duplicar.
// Com dryRun=true, só mostra o que seria feito.
async function restore(req, res) {
  if (!req.file) {
    throw new AppError(400, 'Envie o arquivo de backup (.json)');
  }
  const dryRun = req.body && req.body.dryRun === 'true';
  const userId = req.userId;

  let parsed;
  try {
    parsed = parseBackup(req.file.buffer.toString('utf8'));
  } catch (err) {
    if (err instanceof RangeError) {
      throw new AppError(400, err.message);
    }
    throw err;
  }

  const plan = await buildPlan(parsed.collections, userId);

  const conflicts = Object.entries(plan).reduce((sum, [, item]) => sum + item.conflicts.length, 0);
  if (conflicts > 0) {
    return problem(res, [
      `${conflicts} item(ns) do backup já pertencem a outra conta. Nada foi restaurado.`,
    ]);
  }

  const incoming = {};
  for (const name of Object.keys(MODELS)) {
    incoming[name] = [...plan[name].insert, ...plan[name].restore];
  }
  const broken = brokenReferences(incoming, await knownIds(plan, userId));
  if (broken.length > 0) {
    return problem(
      res,
      broken.map(
        (item) =>
          `${item.collection}.${item.field}: ${item.count} item(ns) apontam para algo que não existe`,
      ),
    );
  }

  const errors = await validateAll(plan, userId);
  if (errors.length > 0) {
    return problem(res, errors.slice(0, MAX_DETAILS));
  }

  const summary = {};
  for (const [name, Model] of Object.entries(MODELS)) {
    const item = plan[name];
    summary[name] = {
      inserted: item.insert.length,
      restored: item.restore.length,
      skipped: item.skip.length,
    };
    if (!dryRun) {
      if (item.insert.length) {
        await Model.insertMany(
          item.insert.map((doc) => ({ ...doc, userId })),
          { ordered: false },
        );
      }
      for (const { _id, ...rest } of item.restore) {
        await Model.replaceOne({ _id, userId }, { ...rest, userId });
      }
    }
  }

  res.json({
    dryRun,
    owner: parsed.owner,
    sameOwner: parsed.owner.toLowerCase() === String(req.user.email).toLowerCase(),
    summary,
  });
}

module.exports = { restore };
