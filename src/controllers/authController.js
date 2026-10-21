const crypto = require('crypto');
const User = require('../models/User');
const Account = require('../models/Account');
const AppError = require('../utils/AppError');
const pick = require('../utils/pick');
const { sendMail } = require('../utils/mailer');
const { validatePassword, hashPassword, verifyPassword } = require('../utils/password');
const { signToken } = require('../utils/token');
const { ensureDefaultCategories } = require('../services/categoryService');

const isString = (value) => typeof value === 'string';
const RESET_TTL_MS = 30 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

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

  // Cada usuário novo já começa com as categorias padrão e uma conta.
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

// Responde sempre igual, para não revelar quais e-mails estão cadastrados.
async function forgotPassword(req, res) {
  const { email } = pick(req.body, ['email']);
  if (!isString(email)) {
    throw new AppError(400, 'Informe o e-mail');
  }

  const user = await User.findOne({ email: email.trim().toLowerCase(), deletedAt: null });
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne(
      { _id: user._id },
      { resetTokenHash: sha256(token), resetTokenExpires: new Date(Date.now() + RESET_TTL_MS) },
    );
    const base = process.env.APP_URL || 'http://localhost:' + (process.env.PORT || 3000);
    try {
      await sendMail({
        to: user.email,
        subject: 'Recuperação de senha - Caderno Financeiro',
        text: `Use o link abaixo para criar uma nova senha (válido por 30 minutos):\n\n${base}/#reset=${token}\n\nSe você não pediu, ignore esta mensagem.`,
      });
    } catch (err) {
      console.error('Falha ao enviar e-mail de recuperação:', err.message);
    }
  }
  res.json({ message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.' });
}

async function resetPassword(req, res) {
  const { token, password } = pick(req.body, ['token', 'password']);
  if (!isString(token) || !/^[a-f0-9]{64}$/.test(token)) {
    throw new AppError(400, 'Link inválido ou expirado');
  }
  const passwordError = validatePassword(password);
  if (passwordError) {
    throw new AppError(400, passwordError);
  }

  // O filtro garante uso único e validade; a atualização é atômica.
  const result = await User.updateOne(
    { resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() }, deletedAt: null },
    {
      $set: { passwordHash: await hashPassword(password) },
      $unset: { resetTokenHash: '', resetTokenExpires: '' },
    },
  );
  if (result.modifiedCount !== 1) {
    throw new AppError(400, 'Link inválido ou expirado');
  }
  res.json({ message: 'Senha alterada. Entre com a nova senha.' });
}

module.exports = { register, login, forgotPassword, resetPassword };
