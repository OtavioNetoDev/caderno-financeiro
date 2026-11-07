const { describePurchase, describeInvoice } = require('../../public/js/cardNotes');

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const MAX_INSTALLMENTS = 48;

function addMonths(month, delta) {
  const [year, mon] = month.split('-').map(Number);
  const index = year * 12 + (mon - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`;
}

// Mês de referência (em que a fatura fecha) de uma compra feita em `date`.
function referenceMonth(date, closingDay) {
  const day = new Date(date);
  const month = `${day.getUTCFullYear()}-${String(day.getUTCMonth() + 1).padStart(2, '0')}`;
  return day.getUTCDate() <= closingDay ? month : addMonths(month, 1);
}

// Se o vencimento vem depois do fechamento, vence no mesmo mês; senão, no seguinte.
function dueMonth(reference, closingDay, dueDay) {
  return dueDay > closingDay ? reference : addMonths(reference, 1);
}

function splitInstallments(totalCents, count) {
  const invalid =
    !Number.isInteger(totalCents) ||
    totalCents < 1 ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > MAX_INSTALLMENTS;
  if (invalid) {
    throw new RangeError(`Informe um valor em centavos e de 1 a ${MAX_INSTALLMENTS} parcelas`);
  }
  const base = Math.floor(totalCents / count);
  const remainder = totalCents - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function installmentsOf(charge, closingDay) {
  const first = referenceMonth(charge.purchaseDate, closingDay);
  const count = charge.installments || 1;
  return splitInstallments(charge.amount, count).map((amount, index) => ({
    month: addMonths(first, index),
    number: index + 1,
    of: count,
    amount,
  }));
}

function buildInvoice(charges, closingDay, month, dueDay) {
  const items = [];
  for (const charge of charges) {
    for (const part of installmentsOf(charge, closingDay)) {
      if (part.month === month) {
        items.push({
          chargeId: String(charge._id),
          description: charge.description,
          categoryId: charge.categoryId ? String(charge.categoryId) : null,
          personName: charge.personName || '',
          purchaseDate: charge.purchaseDate,
          number: part.number,
          of: part.of,
          amount: part.amount,
          // Observação: mês da compra, vencimento e mês em que conta como gasto.
          note: dueDay
            ? describePurchase({
                purchaseDate: charge.purchaseDate,
                closingDay,
                dueDay,
                number: part.number,
                of: part.of,
              }).text
            : '',
        });
      }
    }
  }
  items.sort((a, b) => new Date(a.purchaseDate) - new Date(b.purchaseDate));
  return { month, items, total: items.reduce((sum, item) => sum + item.amount, 0) };
}

// Gasto do mês pela fatura: soma as parcelas de todas as compras que caem em `month`,
// separadas por categoria (categoryId null = sem categoria).
function spendingForMonth(cards, charges, month) {
  const cardsById = new Map(cards.map((card) => [String(card._id), card]));
  const byCategory = new Map();
  const byCard = new Map();
  let total = 0;
  for (const charge of charges) {
    const cardId = String(charge.cardId);
    const card = cardsById.get(cardId);
    if (!card || !card.closingDay) {
      continue;
    }
    for (const part of installmentsOf(charge, card.closingDay)) {
      if (part.month === month) {
        const key = charge.categoryId ? String(charge.categoryId) : null;
        byCategory.set(key, (byCategory.get(key) || 0) + part.amount);
        const current = byCard.get(cardId) || { total: 0, count: 0 };
        current.total += part.amount;
        current.count += 1;
        byCard.set(cardId, current);
        total += part.amount;
      }
    }
  }
  // Uma linha por cartão: quanto da fatura do mês entrou no gasto e de qual período ela é.
  const invoices = [...byCard]
    .map(([cardId, data]) => {
      const card = cardsById.get(cardId);
      return {
        cardId,
        name: card.name || '',
        total: data.total,
        count: data.count,
        description: card.dueDay
          ? describeInvoice({ month, closingDay: card.closingDay, dueDay: card.dueDay })
          : '',
      };
    })
    .sort((a, b) => b.total - a.total);
  return {
    total,
    byCategory: [...byCategory].map(([categoryId, amount]) => ({ categoryId, total: amount })),
    invoices,
  };
}

module.exports = {
  MONTH_RE,
  MAX_INSTALLMENTS,
  addMonths,
  referenceMonth,
  dueMonth,
  splitInstallments,
  installmentsOf,
  buildInvoice,
  spendingForMonth,
};
