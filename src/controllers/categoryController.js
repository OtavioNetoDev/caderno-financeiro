const Category = require('../models/Category');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

const FIELDS = ['name', 'kind', 'color', 'parentId'];

function normalize(data) {
  if (typeof data.name === 'string') {
    data.name = data.name.trim();
  }
  return data;
}

async function assertNameAvailable(userId, name, kind, ignoreId) {
  const filter = { userId, name, kind, deletedAt: null };
  if (ignoreId) {
    filter._id = { $ne: ignoreId };
  }
  if (await Category.exists(filter)) {
    throw new AppError(409, 'Já existe uma categoria com esse nome e tipo');
  }
}

async function findOwned(req) {
  const category = await Category.findOne({
    _id: req.params.id,
    userId: req.userId,
    deletedAt: null,
  });
  if (!category) {
    throw new AppError(404, 'Categoria não encontrada');
  }
  return category;
}

async function list(req, res) {
  const filter = { userId: req.userId, deletedAt: null };
  if (req.query.kind) {
    filter.kind = req.query.kind;
  }
  res.json(await Category.find(filter).sort({ name: 1 }));
}

async function getOne(req, res) {
  res.json(await findOwned(req));
}

async function create(req, res) {
  const data = normalize(pick(req.body, FIELDS));
  await assertNameAvailable(req.userId, data.name, data.kind);
  const category = await Category.create({ ...data, userId: req.userId });
  res.status(201).json(category);
}

async function update(req, res) {
  const category = await findOwned(req);
  const data = normalize(pick(req.body, FIELDS));
  await assertNameAvailable(
    req.userId,
    data.name ?? category.name,
    data.kind ?? category.kind,
    category._id,
  );
  category.set(data);
  await category.save();
  res.json(category);
}

async function remove(req, res) {
  const category = await findOwned(req);
  category.deletedAt = new Date();
  await category.save();
  res.status(204).end();
}

module.exports = { list, getOne, create, update, remove };
