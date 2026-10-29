const { Schema, model } = require('mongoose');

// Modelo de um lançamento que se repete todo mês (assinatura, mensalidade, salário).
// Os lançamentos reais são criados por POST /recurring/generate, um por mês.
const recurringSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    description: {
      type: String,
      required: [true, 'Descrição é obrigatória'],
      trim: true,
      maxlength: [100, 'Descrição muito longa'],
    },
    // Sempre em centavos, inteiro e positivo.
    amount: {
      type: Number,
      required: [true, 'Valor é obrigatório'],
      min: [1, 'O valor deve ser maior que zero'],
      validate: {
        validator: Number.isInteger,
        message: 'O valor deve ser um inteiro em centavos',
      },
    },
    type: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: { values: ['expense', 'income', 'investment'], message: 'Tipo inválido' },
    },
    dayOfMonth: {
      type: Number,
      required: [true, 'Dia do mês é obrigatório'],
      min: [1, 'O dia do mês deve ser de 1 a 31'],
      max: [31, 'O dia do mês deve ser de 1 a 31'],
      validate: { validator: Number.isInteger, message: 'O dia do mês deve ser inteiro' },
    },
    startMonth: {
      type: String,
      required: [true, 'Mês de início é obrigatório'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês de início inválido'],
    },
    endMonth: {
      type: String,
      default: null,
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês final inválido'],
    },
    // Pendente: ainda não pago, você confirma depois. Confirmado: já entra no saldo.
    status: {
      type: String,
      enum: { values: ['pending', 'confirmed'], message: 'Status inválido' },
      default: 'pending',
    },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    accountId: {
      type: Schema.Types.ObjectId,
      ref: 'Account',
      required: [true, 'Conta é obrigatória'],
    },
    active: { type: Boolean, default: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Recurring', recurringSchema);
