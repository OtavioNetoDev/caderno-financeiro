const { Schema, model } = require('mongoose');

const batchSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, required: true, index: true },
    fileName: { type: String, trim: true, maxlength: 120, default: 'arquivo' },
    format: { type: String, required: true, enum: ['txt', 'csv', 'xlsx', 'docx', 'pdf'] },
    status: { type: String, enum: ['confirmed', 'undone'], default: 'confirmed' },
    totalRows: { type: Number, default: 0 },
    importedRows: { type: Number, default: 0 },
    skippedDuplicates: { type: Number, default: 0 },
    undoneAt: { type: Date, default: null },
  },
  { timestamps: true },
);

module.exports = model('ImportBatch', batchSchema);
