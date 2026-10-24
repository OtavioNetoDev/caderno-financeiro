const { Schema, model } = require('mongoose');

const budgetSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    categoryId: { type: Schema.Types.ObjectId, required: true },
    limitAmount: {
      type: Number,
      required: [true, 'Meta é obrigatória'],
      min: [1, 'A meta deve ser maior que zero'],
      validate: { validator: Number.isInteger, message: 'A meta deve ser um inteiro em centavos' },
    },
  },
  { timestamps: true },
);

// Uma meta por categoria e por usuário.
budgetSchema.index({ userId: 1, categoryId: 1 }, { unique: true });

module.exports = model('Budget', budgetSchema);
