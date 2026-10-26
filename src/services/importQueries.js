const Transaction = require('../models/Transaction');

// Lançamentos já existentes no intervalo de dias (AAAA-MM-DD), para detectar duplicados.
async function findExistingTransactions(userId, days) {
  const list = days.filter(Boolean).sort();
  if (!list.length) {
    return [];
  }
  return Transaction.find({
    userId,
    deletedAt: null,
    date: {
      $gte: new Date(list[0] + 'T00:00:00-03:00'),
      $lte: new Date(list[list.length - 1] + 'T23:59:59.999-03:00'),
    },
  })
    .select('date amount type description')
    .lean();
}

module.exports = { findExistingTransactions };
