const Note = require('../models/Note');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');

async function findOwned(req) {
  const note = await Note.findOne({ _id: req.params.id, userId: req.userId, deletedAt: null });
  if (!note) {
    throw new AppError(404, 'Nota não encontrada');
  }
  return note;
}

async function list(req, res) {
  const filter = { userId: req.userId, deletedAt: null };
  if (req.query.month) {
    filter.month = req.query.month;
  }
  res.json(await Note.find(filter).sort({ createdAt: -1 }));
}

async function create(req, res) {
  const note = await Note.create({
    ...pick(req.body, ['month', 'title', 'content']),
    userId: req.userId,
  });
  res.status(201).json(note);
}

async function update(req, res) {
  const note = await findOwned(req);
  note.set(pick(req.body, ['title', 'content']));
  await note.save();
  res.json(note);
}

async function remove(req, res) {
  const note = await findOwned(req);
  note.deletedAt = new Date();
  await note.save();
  res.status(204).end();
}

module.exports = { list, create, update, remove };
