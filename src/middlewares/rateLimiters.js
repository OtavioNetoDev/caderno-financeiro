const { rateLimit } = require('express-rate-limit');

// Limita cadastro e login por IP, para dificultar a adivinhação de senhas.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

module.exports = { authLimiter };
