const { Schema, model } = require('mongoose');

const isCents = { validator: Number.isInteger, message: 'O valor deve ser um inteiro em centavos' };

const entrySchema = new Schema(
  {
    kind: { type: String, required: true, enum: ['contribution', 'redemption', 'income'] },
    amount: {
      type: Number,
      required: true,
      min: [1, 'O valor deve ser maior que zero'],
      validate: isCents,
    },
    date: { type: Date, required: true },
    quantity: { type: Number, min: 0, default: null },
    notes: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { timestamps: true },
);

const investmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: [true, 'Nome é obrigatório'], trim: true, maxlength: 80 },
    type: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: {
        values: ['cdb', 'fii', 'fund', 'stock', 'treasury', 'reserve', 'savings', 'other'],
        message: 'Tipo de investimento inválido',
      },
    },
    annualRate: {
      type: Number,
      min: [0, 'A taxa não pode ser negativa'],
      max: [1000, 'Taxa alta demais'],
      default: 0,
    },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    archived: { type: Boolean, default: false },
    entries: [entrySchema],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Investment', investmentSchema);
