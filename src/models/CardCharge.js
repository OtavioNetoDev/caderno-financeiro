const { Schema, model } = require('mongoose');

const chargeSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    cardId: { type: Schema.Types.ObjectId, required: true, index: true },
    description: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
      maxlength: 120,
    },
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [1, 'O valor deve ser maior que zero'],
      validate: { validator: Number.isInteger, message: 'O valor deve ser um inteiro em centavos' },
    },
    installments: {
      type: Number,
      default: 1,
      min: [1, 'Use de 1 a 48 parcelas'],
      max: [48, 'Use de 1 a 48 parcelas'],
      validate: { validator: Number.isInteger, message: 'Parcelas deve ser um número inteiro' },
    },
    purchaseDate: { type: Date, required: [true, 'Data da compra é obrigatória'] },
    categoryId: { type: Schema.Types.ObjectId, default: null },
    personName: { type: String, trim: true, maxlength: 60, default: '' },
    notes: { type: String, trim: true, maxlength: 200, default: '' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('CardCharge', chargeSchema);
