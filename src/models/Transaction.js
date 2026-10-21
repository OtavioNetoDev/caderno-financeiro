const { Schema, model } = require('mongoose');

const transactionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true },
    type: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: {
        values: ['income', 'expense', 'transfer', 'investment'],
        message: 'Tipo de lançamento inválido',
      },
    },
    // Sempre em centavos, inteiro e positivo (RNF06).
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [1, 'O valor deve ser maior que zero'],
      validate: {
        validator: Number.isInteger,
        message: 'O valor deve ser um inteiro em centavos',
      },
    },
    date: { type: Date, required: [true, 'Data é obrigatória'] },
    description: { type: String, trim: true, maxlength: 200, default: '' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Conta é obrigatória'],
    },
    toAccountId: { type: Schema.Types.ObjectId, ref: 'Account', default: null },
    status: {
      type: String,
      enum: { values: ['confirmed', 'pending'], message: 'Status inválido' },
      default: 'confirmed',
    },
    personId: { type: Schema.Types.ObjectId, default: null },
    personName: { type: String, trim: true, maxlength: 60, default: '' },
    shareMode: { type: String, enum: { values: ['with', 'for'], message: 'shareMode inválido' } },
    paymentMethod: {
      type: String,
      enum: { values: ['cash', 'pix', 'card', 'transfer'], message: 'Forma de pagamento inválida' },
    },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Regras de transferência: exige destino e ele precisa ser diferente da origem.
transactionSchema.pre('validate', function validateTransfer() {
  if (this.type === 'transfer') {
    if (!this.toAccountId) {
      this.invalidate('toAccountId', 'Transferência exige conta de destino');
    } else if (String(this.toAccountId) === String(this.accountId)) {
      this.invalidate('toAccountId', 'A conta de destino deve ser diferente da origem');
    }
  } else if (this.toAccountId) {
    this.invalidate('toAccountId', 'Conta de destino só vale para transferências');
  }
});

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, categoryId: 1, date: -1 });
transactionSchema.index({ userId: 1, status: 1 });

module.exports = model('Transaction', transactionSchema);
