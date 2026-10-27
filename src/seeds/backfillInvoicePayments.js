require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const Card = require('../models/Card');
const Transaction = require('../models/Transaction');

// Marca como "pagamento de fatura" os pagamentos já registrados antes deste campo existir.
// Pode rodar mais de uma vez sem problema. Uso: npm run backfill:invoices
async function run() {
  await connectDatabase(process.env.MONGODB_URI);
  const cards = await Card.find({ 'invoices.transactionId': { $ne: null } });
  const ids = cards.flatMap((card) =>
    card.invoices
      .filter((invoice) => invoice.transactionId)
      .map((invoice) => invoice.transactionId),
  );
  const result = await Transaction.updateMany(
    { _id: { $in: ids }, invoicePayment: { $ne: true } },
    { $set: { invoicePayment: true } },
  );
  console.log(
    `Pagamentos de fatura encontrados: ${ids.length} | atualizados: ${result.modifiedCount}`,
  );
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
