// Verdadeiro se a senha foi trocada depois da emissão do token (issuedAt em segundos).
function isSessionRevoked(passwordChangedAt, issuedAt) {
  if (!passwordChangedAt) {
    return false;
  }
  return Math.floor(new Date(passwordChangedAt).getTime() / 1000) > issuedAt;
}

module.exports = { isSessionRevoked };
