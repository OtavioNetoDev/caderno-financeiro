const { estimateYield } = require('../../public/js/projection');

const DAY_MS = 24 * 60 * 60 * 1000;
const round6 = (value) => Math.round(value * 1e6) / 1e6;

// Posição do investimento a partir das movimentações (valores aproximados, sem marcação a mercado).
// Cotas: aportes com cotas somam, resgates com cotas subtraem. Preço médio = valor pago / cotas compradas.
function position(entries = [], now = new Date()) {
  const since = new Date(now).getTime() - 365 * DAY_MS;
  const until = new Date(now).getTime();
  let contributed = 0;
  let redeemed = 0;
  let income = 0;
  let income12m = 0;
  let bought = 0;
  let sold = 0;
  let paidForBought = 0;
  for (const entry of entries) {
    const quantity = Number(entry.quantity) > 0 ? Number(entry.quantity) : 0;
    if (entry.kind === 'contribution') {
      contributed += entry.amount;
      bought += quantity;
      if (quantity) {
        paidForBought += entry.amount;
      }
    } else if (entry.kind === 'redemption') {
      redeemed += entry.amount;
      sold += quantity;
    } else if (entry.kind === 'income') {
      income += entry.amount;
      const when = new Date(entry.date).getTime();
      if (when >= since && when <= until) {
        income12m += entry.amount;
      }
    }
  }
  const balance = Math.max(contributed - redeemed, 0);
  // Resgatar mais do que foi aplicado gera ganho realizado.
  const realizedGain = Math.max(redeemed - contributed, 0);
  const quantity = round6(Math.max(bought - sold, 0));
  return {
    contributed,
    redeemed,
    income,
    income12m,
    balance,
    received: income + realizedGain,
    quantity,
    averagePrice: bought > 0 ? Math.round(paidForBought / bought) : null,
    incomePerShare12m: quantity > 0 ? Math.round(income12m / quantity) : null,
  };
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

const VARIABLE_TYPES = ['fii', 'stock', 'fund'];
// Dias úteis: o Tesouro e os fundos rendem só em dia útil.
const BUSINESS_DAYS = { week: 5, month: 21, year: 252 };
const round2 = (value) => Math.round(value * 100) / 100;

// Quanto o investimento rende, escolhendo o jeito certo de calcular:
// - "daily": você informou quanto ganha por dia útil (ex.: Tesouro Selic sem saber a taxa);
// - "rate": taxa anual informada (CDB, Tesouro, poupança...), com juros compostos;
// - "income": ações, fundos imobiliários e fundos sem taxa: vale o que pagaram nos últimos 12 meses.
function estimate(data, current) {
  const balance = current.balance;
  const annualRate = Number(data.annualRate) || 0;
  const dailyGain = Number(data.dailyGain) || 0;

  if (dailyGain > 0) {
    const yearly = dailyGain * BUSINESS_DAYS.year;
    return {
      method: 'daily',
      annualRate: balance > 0 ? round2((yearly / balance) * 100) : 0,
      yields: {
        daily: dailyGain,
        weekly: dailyGain * BUSINESS_DAYS.week,
        monthly: dailyGain * BUSINESS_DAYS.month,
        yearly,
      },
    };
  }

  if (annualRate > 0 || !VARIABLE_TYPES.includes(data.type)) {
    return {
      method: 'rate',
      annualRate,
      yields: {
        ...estimateYield(balance, annualRate),
        yearly: Math.round((balance * annualRate) / 100),
      },
    };
  }

  const yearly = current.income12m;
  return {
    method: 'income',
    annualRate: balance > 0 ? round2((yearly / balance) * 100) : 0,
    yields: {
      daily: Math.round(yearly / 365),
      weekly: Math.round(yearly / 52),
      monthly: Math.round(yearly / 12),
      yearly,
    },
  };
}

function present(investment) {
  const data = investment.toJSON ? investment.toJSON() : { ...investment };
  const current = position(data.entries);
  const result = estimate(data, current);
  return {
    ...data,
    position: current,
    estimate: { method: result.method, annualRate: result.annualRate },
    yields: result.yields,
  };
}

const emptyTotals = () => ({
  count: 0,
  balance: 0,
  received: 0,
  yields: { daily: 0, weekly: 0, monthly: 0, yearly: 0 },
});

function addTo(total, current, yields) {
  total.count += 1;
  total.balance += current.balance;
  total.received += current.received;
  for (const key of Object.keys(total.yields)) {
    total.yields[key] += yields[key];
  }
}

// Totais da minha carteira. Investimentos de outras pessoas (sobrinho, mãe...) ficam em "others",
// um total por pessoa, e não entram no meu saldo.
function summarize(investments) {
  const total = emptyTotals();
  const others = new Map();
  for (const investment of investments) {
    if (investment.archived) {
      continue;
    }
    const current = position(investment.entries);
    const { yields } = estimate(investment, current);
    const personName = String(investment.personName || '').trim();
    if (!personName) {
      addTo(total, current, yields);
      continue;
    }
    const key = personName.toLowerCase();
    if (!others.has(key)) {
      others.set(key, { personName, ...emptyTotals() });
    }
    addTo(others.get(key), current, yields);
  }
  return { ...total, others: [...others.values()].sort((a, b) => b.balance - a.balance) };
}

// Fuso America/Bahia (UTC-3): o mês de um provento segue o mesmo fuso do resto do sistema.
const BRAZIL_OFFSET_MS = 3 * 60 * 60 * 1000;
const monthKey = (date) =>
  new Date(new Date(date).getTime() - BRAZIL_OFFSET_MS).toISOString().slice(0, 7);

// Proventos recebidos no período (from/to opcionais). Só entram os investimentos meus;
// o que outras pessoas (sobrinho, mãe...) receberam vai separado em "others".
// "returns" mostra, para cada investimento meu, quanto rendeu sobre o valor investido até o fim do período.
function incomeReport(investments, { from, to } = {}) {
  const until = to || new Date();
  const items = [];
  const returns = [];
  const others = new Map();

  for (const investment of investments) {
    const data = investment.toJSON ? investment.toJSON() : investment;
    const entries = data.entries || [];
    const personName = String(data.personName || '').trim();

    const received = [];
    for (const entry of entries) {
      if (entry.kind !== 'income') {
        continue;
      }
      const when = new Date(entry.date);
      if ((from && when < from) || (to && when > to)) {
        continue;
      }
      received.push({ entry, when });
    }

    if (personName) {
      const key = personName.toLowerCase();
      const current = others.get(key) || { personName, total: 0, count: 0 };
      for (const { entry } of received) {
        current.total += entry.amount;
        current.count += 1;
      }
      if (current.count) {
        others.set(key, current);
      }
      continue;
    }

    let receivedTotal = 0;
    for (const { entry, when } of received) {
      receivedTotal += entry.amount;
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

    if (!data.archived) {
      const untilEntries = entries.filter((entry) => new Date(entry.date) <= until);
      const invested = position(untilEntries, until).balance;
      if (invested > 0) {
        returns.push({
          investmentId: data._id,
          name: data.name,
          invested,
          received: receivedTotal,
          percent: Math.round((receivedTotal / invested) * 10000) / 100,
        });
      }
    }
  }
  items.sort((a, b) => b.date - a.date);
  returns.sort((a, b) => b.invested - a.invested);

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
    returns,
    others: [...others.values()].sort((a, b) => b.total - a.total),
    byInvestment: [...byInvestment.values()].sort((a, b) => b.total - a.total),
    byMonth: [...byMonth.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, sum]) => ({ month, total: sum })),
  };
}

module.exports = { position, applyEntry, present, summarize, incomeReport, estimate };
