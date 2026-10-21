const bcrypt = require('bcryptjs');

const MIN_LENGTH = 8;
const MAX_LENGTH = 72; // limite do bcrypt

const rounds = () => Number(process.env.BCRYPT_ROUNDS) || 12;

// Retorna uma mensagem de erro, ou null se a senha for aceitável.
function validatePassword(password) {
  if (typeof password !== 'string') {
    return 'Senha é obrigatória';
  }
  if (password.length < MIN_LENGTH) {
    return `A senha deve ter pelo menos ${MIN_LENGTH} caracteres`;
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_LENGTH) {
    return `A senha deve ter no máximo ${MAX_LENGTH} bytes`;
  }
  return null;
}

function hashPassword(password) {
  return bcrypt.hash(password, rounds());
}

let dummyHash;

// Sem hash (usuário inexistente), compara com um hash falso para manter o tempo de resposta parecido.
async function verifyPassword(password, hash) {
  if (!hash) {
    dummyHash = dummyHash || (await bcrypt.hash('senha-ficticia', rounds()));
    await bcrypt.compare(password, dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}

module.exports = { validatePassword, hashPassword, verifyPassword };
