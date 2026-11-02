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

// Fuso America/Bahia (UTC-3): o mês de um provento segue o mesmo fuso do resto do sistema.
const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;
const monthKey = (date) =>
  new Date(new Date(date).getTime() - BRAZIL_OFFSET_MS).toISOString().slice(0, 7);

// Proventos recebidos no período (from/to opcionais), de todos os investimentos.
// Ficam separados das receitas: vêm só das movimentações do tipo "income".
function incomeReport(investments, { from, to } = {}) {
  const items = [];
  for (const investment of investments) {
    const data = investment.toJSON ? investment.toJSON() : investment;
    for (const entry of data.entries || []) {
      if (entry.kind !== 'income') {
        continue;
      }
      const when = new Date(entry.date);
      if ((from && when < from) || (to && when > to)) {
        continue;
      }
      items.push({
        id: entry._id,
        investmentId: data._id,
        investmentName: data.name,
        type: data.type,
        date: when,
        amount: entry.amount,
        quantity: entry.quantity ?? null,
        notes: entry.notes || '',
      });
    }
  }
  items.sort((a, b) => b.date - a.date);

  const byInvestment = new Map();
  const byMonth = new Map();
  let total = 0;
  for (const item of items) {
    total += item.amount;
    const key = String(item.investmentId);
    const current = byInvestment.get(key) || {
      investmentId: item.investmentId,
      name: item.investmentName,
      total: 0,
      count: 0,
    };
    current.total += item.amount;
    current.count += 1;
    byInvestment.set(key, current);
    const month = monthKey(item.date);
    byMonth.set(month, (byMonth.get(month) || 0) + item.amount);
  }

  return {
    total,
    count: items.length,
    items,
    byInvestment: [...byInvestment.values()].sort((a, b) => b.total - a.total),
    byMonth: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, sum]) => ({ month, total: sum })),
  };
}

module.exports = { position, applyEntry, present, summarize, incomeReport };
