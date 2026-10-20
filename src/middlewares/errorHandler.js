const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'Rota não encontrada'));
}

function errorHandler(err, req, res, next) {
  // eslint-disable-line no-unused-vars
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ error: 'Dados inválidos', details });
  }
  if (err.name === 'CastError') {
    return res.status(400).json({ error: `Valor inválido para ${err.path}` });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Erro interno do servidor' });
}

module.exports = { notFound, errorHandler };
