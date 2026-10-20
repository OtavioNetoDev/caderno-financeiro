const Category = require('../models/Category');
const defaultCategories = require('../seeds/defaultCategories');

// Cria as categorias padrão que ainda não existem para o usuário (pode rodar várias vezes).
async function ensureDefaultCategories(userId) {
  const operations = defaultCategories.map((category) => ({
    updateOne: {
      filter: { userId, name: category.name, kind: category.kind },
      update: { $setOnInsert: { ...category, userId, isDefault: true } },
      upsert: true,
    },
  }));
  const result = await Category.bulkWrite(operations);
  return result.upsertedCount;
}

module.exports = { ensureDefaultCategories };
