require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const User = require('../models/User');
const { ensureDefaultCategories } = require('../services/categoryService');

// Uso: npm run seed -- seu@email.com
async function run() {
  const email = process.argv[2];
  if (!email) {
    throw new Error('Uso: npm run seed -- seu@email.com');
  }
  await connectDatabase(process.env.MONGODB_URI);
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    throw new Error('Usuário não encontrado');
  }
  const created = await ensureDefaultCategories(user._id);
  console.log(`Categorias novas: ${created}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
