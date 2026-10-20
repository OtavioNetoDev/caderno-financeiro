const AppError = require('../utils/AppError');

// Provisório: até existir login (JWT), usa um usuário fixo de desenvolvimento.
function currentUser(req, res, next) {
  const id = process.env.DEV_USER_ID;
  if (!id) {
    return next(new AppError(500, 'DEV_USER_ID não definido no .env'));
  }
  req.userId = id;
  return next();
}

module.exports = currentUser;
