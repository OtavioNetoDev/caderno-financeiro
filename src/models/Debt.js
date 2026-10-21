const { Schema, model } = require('mongoose');

const isCents = { validator: Number.isInteger, message: 'O valor deve ser um inteiro em centavos' };

const entrySchema = new Schema(
  {
    kind: { type: String, required: true, enum: ['payment', 'increase'] },
    amount: {
      type: Number,
      required: true,
      min: [1, 'O valor deve ser maior que zero'],
      validate: isCents,
    },
    date: { type: Date, required: true },
    notes: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true },
);

const debtSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    personName: {
      type: String,
      required: [true, 'Pessoa é obrigatória'],
      trim: true,
      maxlength: 60,
    },
    direction: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: { values: ['receivable', 'payable'], message: 'Tipo de dívida inválido' },
    },
    originalAmount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [1, 'O valor deve ser maior que zero'],
      validate: isCents,
    },
    balance: { type: Number, min: 0 },
    status: { type: String, enum: ['open', 'settled'], default: 'open' },
    dueDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    entries: [entrySchema],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

debtSchema.pre('validate', function setInitialBalance() {
  if (this.isNew && this.balance === undefined) {
    this.balance = this.originalAmount;
  }
});

module.exports = model('Debt', debtSchema);
