// Regras dos lançamentos recorrentes (assinaturas e mensalidades), sem acesso ao banco.
const AppError = require('../utils/AppError');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TYPES = ['expense', 'income', 'investment'];
const STATUSES = ['pending', 'confirmed'];

function fail(message) {
  throw new AppError(400, message);
}

function daysInMonth(month) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon, 0)).getUTCDate();
}

// Dia 31 em fevereiro cai no último dia do mês.
function dayForMonth(month, day) {
  return Math.min(day, daysInMonth(month));
}

// Meio-dia no fuso America/Bahia (UTC-3), para a data nunca cair no dia vizinho.
function occurrenceDate(month, day) {
  const [year, mon] = month.split('-').map(Number);
  return new Date(Date.UTC(year, mon - 1, dayForMonth(month, day), 15));
}

function isActiveInMonth(recurring, month) {
  return (
    recurring.active !== false &&
    month >= recurring.startMonth &&
    (!recurring.endMonth || month <= recurring.endMonth)
  );
}

// Confere e limpa os dados de um recorrente. Lança AppError 400 com a mensagem para o usuário.
function validateRecurring(input) {
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (!description || description.length > 100) {
    fail('Informe uma descrição de até 100 caracteres');
  }
  if (!Number.isInteger(input.amount) || input.amount < 1) {
    fail('O valor deve ser um inteiro em centavos, maior que zero');
  }
  if (!TYPES.includes(input.type)) {
    fail('Tipo inválido: use despesa, receita ou investimento');
  }
  if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth < 1 || input.dayOfMonth > 31) {
    fail('O dia do mês deve ser de 1 a 31');
  }
  if (!MONTH_RE.test(input.startMonth || '')) {
    fail('Informe o mês de início no formato AAAA-MM');
  }
  const endMonth = input.endMonth || null;
  if (endMonth && !MONTH_RE.test(endMonth)) {
    fail('Informe o mês final no formato AAAA-MM');
  }
  if (endMonth && endMonth < input.startMonth) {
    fail('O mês final não pode ser antes do início');
  }
  const status = input.status === undefined ? 'pending' : input.status;
  if (!STATUSES.includes(status)) {
    fail('Status inválido');
  }
  if (!input.accountId) {
    fail('Escolha a conta');
  }
  return {
    description,
    amount: input.amount,
    type: input.type,
    dayOfMonth: input.dayOfMonth,
    startMonth: input.startMonth,
    endMonth,
    status,
    categoryId: input.categoryId ? String(input.categoryId) : null,
    accountId: String(input.accountId),
    active: input.active !== false,
  };
}

// Decide o que gerar em um mês.
// existing: Set com "idDoRecorrente|AAAA-MM" dos lançamentos já gerados (inclusive os excluídos,
// para um lançamento apagado de propósito não voltar). accountIds: contas que ainda existem.
function planGeneration(recurrings, month, existing, accountIds) {
  const toCreate = [];
  let alreadyExisted = 0;
  let missingAccount = 0;
  for (const recurring of recurrings) {
    if (!isActiveInMonth(recurring, month)) {
      continue;
    }
    const id = String(recurring._id);
    if (existing.has(`${id}|${month}`)) {
      alreadyExisted += 1;
      continue;
    }
    if (!accountIds.has(String(recurring.accountId))) {
      missingAccount += 1;
      continue;
    }
    toCreate.push({
      recurringId: id,
      recurringMonth: month,
      type: recurring.type,
      amount: recurring.amount,
      date: occurrenceDate(month, recurring.dayOfMonth),
      description: recurring.description,
      categoryId: recurring.categoryId || null,
      accountId: String(recurring.accountId),
      status: recurring.status,
    });
  }
  return { toCreate, alreadyExisted, missingAccount };
}

module.exports = {
  MONTH_RE,
  TYPES,
  STATUSES,
  daysInMonth,
  dayForMonth,
  occurrenceDate,
  isActiveInMonth,
  validateRecurring,
  planGeneration,
};
