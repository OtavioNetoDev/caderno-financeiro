const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

// Exige "Authorization: Bearer <token>" e carrega o usuário dono do token.
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'Autenticação necessária');
  }

  const { userId } = verifyToken(token);
  const user = await User.findOne({ _id: userId, deletedAt: null });
  if (!user) {
    throw new AppError(401, 'Usuário não encontrado');
  }

  req.user = user;
  req.userId = String(user._id);
  next();
});

module.exports = authenticate;
