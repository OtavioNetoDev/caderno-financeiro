require('dotenv').config();
const mongoose = require('mongoose');
const { connectDatabase } = require('../config/database');
const { ensureDefaultCategories } = require('../services/categoryService');

async function run() {
  const userId = process.env.DEV_USER_ID;
  if (!userId) {
    throw new Error('DEV_USER_ID não definido no .env');
  }
  await connectDatabase(process.env.MONGODB_URI);
  const created = await ensureDefaultCategories(userId);
  console.log(`Categorias novas: ${created}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
