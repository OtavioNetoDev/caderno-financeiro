// Situação da meta: percentual usado (arredondado para baixo), saldo e nível de alerta.
function statusOf(limit, spent) {
  const percent = limit > 0 ? Math.floor((spent * 100) / limit) : 0;
  let level = 'ok';
  if (percent >= 100) {
    level = 'exceeded';
  } else if (percent >= 80) {
    level = 'warning';
  }
  return { percent, remaining: limit - spent, level };
}

module.exports = { statusOf };
