const jwt = require('jsonwebtoken');
const AppError = require('./AppError');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET ausente ou curto demais (mínimo de 32 caracteres)');
  }
  return secret;
}

function signToken(userId, options = {}) {
  return jwt.sign({}, getSecret(), {
    subject: String(userId),
    expiresIn: process.env.JWT_EXPIRES_IN || '12h',
    algorithm: 'HS256',
    ...options,
  });
}

function verifyToken(token) {
  const secret = getSecret();
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return { userId: payload.sub };
  } catch {
    throw new AppError(401, 'Token inválido ou expirado');
  }
}

module.exports = { signToken, verifyToken };
