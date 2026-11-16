const { rateLimit } = require('express-rate-limit');

const WINDOW_MS = 15 * 60 * 1000;

// Limita cadastro e login por IP, para dificultar a adivinhação de senhas.
const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas. Tente novamente em alguns minutos.' },
});

// Limite geral da API, folgado para o uso normal da interface.
const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: Number(process.env.API_RATE_LIMIT) || 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Aguarde alguns minutos.' },
});

// Rotas que processam arquivos (PDF, planilhas, backup) gastam mais CPU.
const heavyLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: Number(process.env.HEAVY_RATE_LIMIT) || 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Muitos envios de arquivo. Tente novamente em alguns minutos.' },
});

module.exports = { authLimiter, apiLimiter, heavyLimiter };
