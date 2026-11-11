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
    // Quanto rende em % do CDI (85 = 85% do CDI). 0 = não informado.
    cdiPercent: {
      type: Number,
      min: [0, 'O percentual do CDI não pode ser negativo'],
      max: [1000, 'Percentual do CDI alto demais'],
      default: 0,
    },
    notes: { type: String, trim: true, maxlength: 300, default: '' },
    // Vazio = investimento meu. Preenchido = de outra pessoa (sobrinho, mãe...), fora da minha carteira.
    personName: {
      type: String,
      trim: true,
      maxlength: [60, 'Nome da pessoa muito longo'],
      default: '',
    },
    // Quanto rende por dia útil (centavos). Para quando não se sabe a taxa, como no Tesouro Selic.
    dailyGain: {
      type: Number,
      min: [0, 'O ganho por dia não pode ser negativo'],
      validate: isCents,
      default: 0,
    },
    // Valor real que eu vi no app do banco (centavos) e a data dele. 0 = não informado, aí o sistema estima.
    currentValue: {
      type: Number,
      min: [0, 'O valor atual não pode ser negativo'],
      validate: isCents,
      default: 0,
    },
    currentValueDate: { type: Date, default: null },
    // Código na bolsa (MXRF11, VALE3). Vazio = tenta deduzir pelo nome.
    ticker: { type: String, trim: true, uppercase: true, maxlength: 12, default: '' },
    // Quanto cada cota paga de provento por mês, em centavos (10 = R$ 0,10).
    monthlyIncomePerShare: {
      type: Number,
      min: [0, 'O provento por cota não pode ser negativo'],
      validate: isCents,
      default: 0,
    },
    archived: { type: Boolean, default: false },
    entries: [entrySchema],
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Investment', investmentSchema);
