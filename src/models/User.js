const { Schema, model } = require('mongoose');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
      maxlength: [80, 'Nome muito longo'],
    },
    email: {
      type: String,
      required: [true, 'E-mail é obrigatório'],
      trim: true,
      lowercase: true,
      unique: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'E-mail inválido'],
    },
    // Guarda apenas o hash (bcrypt), nunca a senha. Fica fora das consultas por padrão.
    passwordHash: { type: String, required: [true, 'Hash da senha é obrigatório'], select: false },
    currency: { type: String, default: 'BRL' },
    timezone: { type: String, default: 'America/Bahia' },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = model('User', userSchema);
