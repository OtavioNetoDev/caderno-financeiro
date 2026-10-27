const Card = require('../models/Card');
const CardCharge = require('../models/CardCharge');
const { spendingForMonth } = require('./cardService');

// Gasto de cartão do mês (pelo mês da fatura), por categoria.
// Cartões arquivados entram: as compras antigas continuam sendo gasto real.
async function loadCardSpending(userId, month) {
  const [cards, charges] = await Promise.all([
    Card.find({ userId, deletedAt: null }),
    CardCharge.find({ userId, deletedAt: null }),
  ]);
  return spendingForMonth(cards, charges, month);
}

module.exports = { loadCardSpending };
