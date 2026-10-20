const { Schema, model } = require('mongoose');

const accountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxlength: [60, 'Nome muito longo'],
    },
    type: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: {
        values: ['cash', 'checking', 'savings', 'wallet', 'reserve'],
        message: 'Tipo de conta inválido',
      },
    },
    initialBalance: {
      type: Number,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: 'initialBalance deve ser um inteiro em centavos',
      },
    },
    archived: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Account', accountSchema);
