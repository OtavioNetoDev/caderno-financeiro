const User = require('../models/User');
const Account = require('../models/Account');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { validatePassword, hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { ensureDefaultCategories } = require('../services/categoryService');

const isString = (value) => typeof value === 'string';

async function register(req, res) {
  const { name, email, password } = pick(req.body, ['name', 'email', 'password']);

  if (!isString(name) || !isString(email)) {
    throw new AppError(400, 'Nome e e-mail são obrigatórios');
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new AppError(400, passwordError);
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    throw new AppError(409, 'E-mail já cadastrado');
  }

  let user;
  try {
    user = await User.create({
      name,
      email: normalizedEmail,
      passwordHash: await hashPassword(password),
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(409, 'E-mail já cadastrado');
    }
    throw err;
  }

  // Cada usuário novo já começa com as categorias padrão.
  await ensureDefaultCategories(user._id);
  await Account.create({ userId: user._id, name: 'Carteira', type: 'cash', initialBalance: 0 });
  res.status(201).json({ user, token: signToken(user._id) });
}

async function login(req, res) {
  const { email, password } = pick(req.body, ['email', 'password']);
  if (!isString(email) || !isString(password)) {
    throw new AppError(400, 'E-mail e senha são obrigatórios');
  }

  const user = await User.findOne({
    email: email.trim().toLowerCase(),
    deletedAt: null,
  }).select('+passwordHash');

  const valid = await verifyPassword(password, user && user.passwordHash);
  if (!user || !valid) {
    // Mesma mensagem nos dois casos, para não revelar quais e-mails existem.
    throw new AppError(401, 'E-mail ou senha inválidos');
  }
  res.json({ user, token: signToken(user._id) });
}

module.exports = { register, login };
