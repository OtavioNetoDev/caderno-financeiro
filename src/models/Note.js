const { Schema, model } = require('mongoose');

const noteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    month: {
      type: String,
      required: [true, 'Mês é obrigatório'],
      match: [/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês deve estar no formato AAAA-MM'],
    },
    title: { type: String, trim: true, maxlength: 100, default: '' },
    content: {
      type: String,
      required: [true, 'O texto da nota é obrigatório'],
      trim: true,
      maxlength: 5000,
    },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Note', noteSchema);
