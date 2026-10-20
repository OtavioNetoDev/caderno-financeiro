const { Schema, model } = require('mongoose');

const categorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxlength: [60, 'Nome muito longo'],
    },
    kind: {
      type: String,
      required: [true, 'Tipo é obrigatório'],
      enum: { values: ['expense', 'income', 'investment'], message: 'Tipo inválido' },
    },
    color: {
      type: String,
      default: '#6b7280',
      match: [/^#[0-9a-fA-F]{6}$/, 'Cor inválida (use o formato #rrggbb)'],
    },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    isDefault: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('Category', categorySchema);
