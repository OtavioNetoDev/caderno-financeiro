const { estimateYield } = require('../../public/js/projection');

// Posição do investimento a partir das movimentações (valores aproximados, sem marcação a mercado).
function position(entries = []) {
  let contributed = 0;
  let redeemed = 0;
  let income = 0;
  for (const entry of entries) {
    if (entry.kind === 'contribution') {
      contributed += entry.amount;
    } else if (entry.kind === 'redemption') {
      redeemed += entry.amount;
    } else if (entry.kind === 'income') {
      income += entry.amount;
    }
  }
  const balance = Math.max(contributed - redeemed, 0);
  // Resgatar mais do que foi aplicado gera ganho realizado.
  const realizedGain = Math.max(redeemed - contributed, 0);
  return { contributed, redeemed, income, balance, received: income + realizedGain };
}

// Registra uma movimentação. Devolve uma mensagem de erro ou null.
function applyEntry(investment, entry) {
  if (!['contribution', 'redemption', 'income'].includes(entry.kind)) {
    return 'Tipo de movimentação inválido';
  }
  if (!Number.isInteger(entry.amount) || entry.amount <= 0) {
    return 'O valor deve ser um inteiro em centavos maior que zero';
  }
  investment.entries.push(entry);
  return null;
}

function present(investment) {
  const data = investment.toJSON ? investment.toJSON() : { ...investment };
  const current = position(data.entries);
  return {
    ...data,
    position: current,
    yields: estimateYield(current.balance, data.annualRate || 0),
  };
}

function summarize(investments) {
  const total = { count: 0, balance: 0, received: 0, yields: { daily: 0, weekly: 0, monthly: 0 } };
  for (const investment of investments) {
    if (investment.archived) {
      continue;
    }
    const current = position(investment.entries);
    const yields = estimateYield(current.balance, investment.annualRate || 0);
    total.count += 1;
    total.balance += current.balance;
    total.received += current.received;
    total.yields.daily += yields.daily;
    total.yields.weekly += yields.weekly;
    total.yields.monthly += yields.monthly;
  }
  return total;
}

module.exports = { position, applyEntry, present, summarize };
