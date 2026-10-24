const { Schema, model } = require('mongoose');

const intOrNull = {
  validator: (value) => value === null || value === undefined || Number.isInteger(value),
  message: 'O valor deve ser um inteiro em centavos',
};

const invoiceSchema = new Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ },
    billedTotal: { type: Number, default: null, min: 0, validate: intOrNull },
    paid: { type: Boolean, default: false },
    paidAmount: { type: Number, default: null },
    transactionId: { type: Schema.Types.ObjectId, default: null },
  },
  { _id: false },
);

const day = (label) => ({
  type: Number,
  required: [true, `${label} é obrigatório`],
  min: [1, 'Use um dia de 1 a 28'],
  max: [28, 'Use um dia de 1 a 28'],
  validate: { validator: Number.isInteger, message: 'Use um número inteiro' },
});

const cardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true, maxlength: 60 },
    closingDay: day('Dia de fechamento'),
    dueDay: day('Dia de vencimento'),
    creditLimit: { type: Number, default: null, min: 0, validate: intOrNull },
    invoices: [invoiceSchema],
    archived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Card', cardSchema);
