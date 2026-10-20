require('dotenv').config();
const app = require('./app');
const { connectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await connectDatabase(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Caderno Financeiro rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error('Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

start();
