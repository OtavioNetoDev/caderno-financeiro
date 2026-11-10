require('dotenv').config();
const app = require('./app');
const { getCdi } = require('./services/ratesService');
const { connectDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET ausente ou curto demais (mínimo de 32 caracteres)');
    }
    await connectDatabase(process.env.MONGODB_URI);
    app.listen(PORT, () => {
      console.log(`Caderno Financeiro rodando na porta ${PORT}`);
      // Esquenta o CDI para a primeira abertura de Investimentos não esperar a internet.
      getCdi();
    });
  } catch (err) {
    console.error('Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

start();
