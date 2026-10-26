const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'Rota não encontrada'));
}

function errorHandler(err, req, res, _next) {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'JSON inválido' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Corpo da requisição grande demais' });
  }
  if (err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'Arquivo grande demais (máximo de 5 MB)'
        : 'Falha no envio do arquivo';
    return res.status(400).json({ error: message });
  }
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
