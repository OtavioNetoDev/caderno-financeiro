const { position } = require('./investmentService');

const DAY_MS = 24 * 60 * 60 * 1000;
const round1 = (value) => Math.round(value * 10) / 10;
const round2 = (value) => Math.round(value * 100) / 100;

// Poupança e cofrinho ficam no mesmo quadrado.
const GROUPS = {
  stock: 'stock',
  fii: 'fii',
  treasury: 'treasury',
  fund: 'fund',
  cdb: 'cdb',
  savings: 'savings',
  reserve: 'savings',
  other: 'other',
};

// Ações e FIIs têm cotação de mercado.
const MARKET_TYPES = ['stock', 'fii'];
const TICKER_ALIASES = { VALE: 'VALE3' };

// Ticker informado, ou deduzido do nome (mxrf11, ggrc11, vale).
function tickerOf(data) {
  const typed = String(data.ticker || '')
    .trim()
    .toUpperCase();
  if (typed) {
    return typed;
  }
  const name = String(data.name || '')
    .trim()
    .toUpperCase();
  if (/^[A-Z]{4}\d{1,2}$/.test(name)) {
    return name;
  }
  return TICKER_ALIASES[name] || '';
}

// Cotação, preço médio (alta ou baixa) e proventos por mês de uma ação ou FII.
function marketInfo(data, current, quote) {
  const perShare = Number(data.monthlyIncomePerShare) || 0;
  const info = {
    market: true,
    ticker: tickerOf(data),
    price: null,
    previousClose: null,
    dayChange: null,
    averagePrice: current.averagePrice,
    vsAverage: null,
    incomePerShare: perShare,
    monthlyIncome: Math.round(current.quantity * perShare),
  };
  if (quote && quote.price > 0) {
    info.price = quote.price;
    info.previousClose = quote.previousClose || null;
    if (info.previousClose) {
      info.dayChange = round2((quote.price / info.previousClose - 1) * 100);
    }
    if (current.averagePrice) {
      info.vsAverage = round2((quote.price / current.averagePrice - 1) * 100);
    }
  }
  return info;
}

// Qual taxa anual usar para estimar o valor atual, e de onde ela vem.
function valuationRate(data, cdi) {
  const dailyGain = Number(data.dailyGain) || 0;
  const annualRate = Number(data.annualRate) || 0;
  if (dailyGain > 0) {
    const balance = position(data.entries || []).balance;
    const rate = balance > 0 ? ((dailyGain * 252) / balance) * 100 : 0;
    return { rate, source: 'daily' };
  }
  if (annualRate > 0) {
    return { rate: annualRate, source: 'rate' };
  }
  // Percentual do CDI (ex.: 85 = 85% do CDI do dia).
  const cdiPercent = Number(data.cdiPercent) || 0;
  if (cdiPercent > 0 && cdi) {
    return { rate: (cdi * cdiPercent) / 100, source: 'cdipct' };
  }
  if (MARKET_TYPES.includes(data.type)) {
    return { rate: 0, source: 'cost' };
  }
  if (cdi) {
    return { rate: cdi, source: 'cdi' };
  }
  return { rate: 0, source: 'cost' };
}

// Valor atual estimado: cada aporte rende juros compostos desde a sua data.
// Se existe "valor real" informado, ele vira o ponto de partida e só valem as movimentações depois dele.
function valuation(data, { cdi = null, now = new Date() } = {}) {
  const entries = data.entries || [];
  const current = position(entries, now);
  const { rate, source } = valuationRate(data, cdi);
  const nowMs = new Date(now).getTime();
  const grow = (amount, from) => {
    const days = Math.max((nowMs - new Date(from).getTime()) / DAY_MS, 0);
    return amount * Math.pow(1 + rate / 100, days / 365);
  };
  const hasManual = Number(data.currentValue) > 0 && Boolean(data.currentValueDate);
  const manualAt = hasManual ? new Date(data.currentValueDate).getTime() : null;

  let value = hasManual ? grow(Number(data.currentValue), manualAt) : 0;
  for (const entry of entries) {
    if (entry.kind === 'income') {
      continue;
    }
    if (hasManual && new Date(entry.date).getTime() <= manualAt) {
      continue;
    }
    value += (entry.kind === 'redemption' ? -1 : 1) * grow(entry.amount, entry.date);
  }
  value = Math.max(Math.round(value), 0);
  return {
    value,
    gain: value - current.balance + current.income,
    source: hasManual ? 'manual' : source,
    rate: round2(rate),
  };
}

// Carteira agrupada por tipo, com totais, participação de cada ativo e histórico de movimentações.
// Investimentos de outras pessoas e arquivados ficam de fora.
// quotes: { TICKER: { price, previousClose } } em centavos, para ações e FIIs.
function portfolio(investments, { cdi = null, now = new Date(), quotes = {} } = {}) {
  const groups = new Map();
  const others = new Map();
  const history = [];
  const total = { applied: 0, value: 0, gain: 0, received: 0, monthly: 0 };

  for (const investment of investments) {
    const data = investment.toJSON ? investment.toJSON() : investment;
    if (data.archived) {
      continue;
    }
    const personName = String(data.personName || '').trim();
    const current = position(data.entries || [], now);
    const market = MARKET_TYPES.includes(data.type)
      ? marketInfo(data, current, quotes[tickerOf(data)])
      : null;
    let result = valuation(data, { cdi, now });
    if (market && market.price && current.quantity > 0) {
      const value = Math.round(current.quantity * market.price);
      result = { value, gain: value - current.balance + current.income, source: 'market', rate: 0 };
    }
    let monthly =
      result.rate > 0
        ? Math.round(result.value * (Math.pow(1 + result.rate / 100, 1 / 12) - 1))
        : Math.round(current.income12m / 12);
    if (market && market.incomePerShare > 0) {
      monthly = market.monthlyIncome;
    }
    const item = {
      id: String(data._id),
      name: data.name,
      type: data.type,
      quantity: current.quantity,
      applied: current.balance,
      value: result.value,
      gain: result.gain,
      received: current.received,
      monthly,
      rate: result.rate,
      source: result.source,
      currentValue: Number(data.currentValue) || 0,
      annualRate: Number(data.annualRate) || 0,
      dailyGain: Number(data.dailyGain) || 0,
      cdiPercent: Number(data.cdiPercent) || 0,
      share: 0,
      ...(market || { market: false }),
    };
    if (personName) {
      const otherKey = personName.toLowerCase();
      if (!others.has(otherKey)) {
        others.set(otherKey, {
          personName,
          applied: 0,
          value: 0,
          gain: 0,
          received: 0,
          monthly: 0,
          items: [],
        });
      }
      const person = others.get(otherKey);
      person.items.push(item);
      for (const field of ['applied', 'value', 'gain', 'received', 'monthly']) {
        person[field] += item[field];
      }
      continue;
    }
    const key = GROUPS[data.type] || 'other';
    if (!groups.has(key)) {
      groups.set(key, { key, applied: 0, value: 0, gain: 0, received: 0, monthly: 0, items: [] });
    }
    const group = groups.get(key);
    group.items.push(item);
    for (const target of [group, total]) {
      target.applied += current.balance;
      target.value += result.value;
      target.gain += result.gain;
      target.received += current.received;
      target.monthly += monthly;
    }
    for (const entry of data.entries || []) {
      history.push({
        entryId: String(entry._id),
        investmentId: String(data._id),
        name: data.name,
        group: key,
        kind: entry.kind,
        amount: entry.amount,
        quantity: entry.quantity ?? null,
        notes: entry.notes || '',
        date: entry.date,
      });
    }
  }

  const list = [...groups.values()].sort((a, b) => b.value - a.value);
  for (const group of list) {
    group.percent = total.value > 0 ? round1((group.value / total.value) * 100) : 0;
    group.items.sort((a, b) => b.value - a.value);
    for (const item of group.items) {
      item.share = group.value > 0 ? round1((item.value / group.value) * 100) : 0;
    }
  }
  history.sort((a, b) => new Date(b.date) - new Date(a.date));
  const people = [...others.values()].sort((a, b) => b.value - a.value);
  for (const person of people) {
    person.items.sort((a, b) => b.value - a.value);
  }
  return { total, groups: list, history, others: people };
}

module.exports = { valuation, portfolio, tickerOf, MARKET_TYPES };
