// Regras puras dos relatórios dos gráficos (sem banco), para serem testadas com node --test.
const AppError = require('../utils/AppError');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TIMEZONE = 'America/Bahia';
const MAX_MONTHS = 24;

function assertMonth(value, field = 'month') {
  if (!MONTH_RE.test(value || '')) {
    throw new AppError(400, `Informe ${field} no formato AAAA-MM`);
  }
  return value;
}

// Quantidade de meses: padrão 6, de 1 a 24.
function parseMonthCount(value) {
  if (value === undefined || value === '') {
    return 6;
  }
  const count = Number(value);
  if (!Number.isInteger(count) || count < 1 || count > MAX_MONTHS) {
    throw new AppError(400, `months deve ser um inteiro de 1 a ${MAX_MONTHS}`);
  }
  return count;
}

// Lista os últimos `count` meses terminando em `end`, do mais antigo para o mais novo.
function monthsEndingAt(end, count) {
  const [year, month] = end.split('-').map(Number);
  const list = [];
  for (let back = count - 1; back >= 0; back -= 1) {
    const index = year * 12 + (month - 1) - back;
    const y = Math.floor(index / 12);
    const m = (index % 12) + 1;
    list.push(`${y}-${String(m).padStart(2, '0')}`);
  }
  return list;
}

// Limites do mês em UTC, no fuso America/Bahia (UTC-3): começa às 03:00 UTC.
function monthBounds(month) {
  const [year, mon] = month.split('-').map(Number);
  return {
    start: new Date(Date.UTC(year, mon - 1, 1, 3)),
    end: new Date(Date.UTC(year, mon, 1, 3)),
  };
}

function daysInMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

// rows: [{ _id: { month, type }, total }] (confirmados, sem pagamento de fatura).
// cardByMonth: { 'AAAA-MM': centavos } — a fatura do cartão entra como despesa do mês.
function assembleMonthly(months, rows, cardByMonth = {}) {
  const lookup = new Map(rows.map((row) => [`${row._id.month}|${row._id.type}`, row.total]));
  const pick = (month, type) => lookup.get(`${month}|${type}`) || 0;
  const income = months.map((month) => pick(month, 'income'));
  const card = months.map((month) => cardByMonth[month] || 0);
  const expense = months.map((month, i) => pick(month, 'expense') + card[i]);
  const investment = months.map((month) => pick(month, 'investment'));
  return {
    months,
    income,
    expense,
    investment,
    cardExpense: card,
    profit: income.map((value, i) => value - expense[i]),
  };
}

// rows: [{ _id: { day: 'AAAA-MM-DD', type }, total }]. Devolve um valor por dia do mês.
function assembleDaily(month, rows) {
  const total = daysInMonth(month);
  const days = Array.from(
    { length: total },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  );
  const lookup = new Map(rows.map((row) => [`${row._id.day}|${row._id.type}`, row.total]));
  const series = (type) => days.map((day) => lookup.get(`${day}|${type}`) || 0);
  return {
    month,
    days,
    income: series('income'),
    expense: series('expense'),
    investment: series('investment'),
  };
}

// Junta duas listas [{ key, total }] somando as chaves iguais, da maior para a menor.
function mergeTotals(...lists) {
  const merged = new Map();
  for (const list of lists) {
    for (const item of list) {
      merged.set(item.key, (merged.get(item.key) || 0) + item.total);
    }
  }
  return [...merged]
    .map(([key, total]) => ({ key, total }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);
}

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

// rows: [{ _id: 1..7 (1 = domingo, como no MongoDB), total }].
function assembleWeekdays(rows) {
  const lookup = new Map(rows.map((row) => [row._id, row.total]));
  return WEEKDAYS.map((label, i) => ({ key: label, total: lookup.get(i + 1) || 0 }));
}

module.exports = {
  MONTH_RE,
  TIMEZONE,
  MAX_MONTHS,
  WEEKDAYS,
  assertMonth,
  parseMonthCount,
  monthsEndingAt,
  monthBounds,
  daysInMonth,
  assembleMonthly,
  assembleDaily,
  mergeTotals,
  assembleWeekdays,
};
