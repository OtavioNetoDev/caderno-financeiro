// Espera a promessa por no máximo "ms". Passou do prazo: devolve null e deixa a promessa terminar
// sozinha em segundo plano (quem a criou pode guardar o resultado para a próxima vez).
function withDeadline(promise, ms) {
  if (!ms) {
    return promise;
  }
  let timer;
  const limit = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), ms);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

module.exports = withDeadline;
