const User = require('../models/User');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { validatePassword, hashPassword } = require('../utils/password');
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
  res.status(201).json({ user, token: signToken(user._id) });
}

module.exports = { register };
