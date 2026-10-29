const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const debtRoutes = require('./routes/debts');
const investmentRoutes = require('./routes/investments');
const noteRoutes = require('./routes/notes');
const cardRoutes = require('./routes/cards');
const budgetRoutes = require('./routes/budgets');
const exportRoutes = require('./routes/export');
const restoreRoutes = require('./routes/restore');
const importRoutes = require('./routes/imports');
const reportRoutes = require('./routes/reports');
const recurringRoutes = require('./routes/recurring');
const authenticate = require('./middlewares/authenticate');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

// CORS fechado por padrão; libere origens com CORS_ORIGIN=http://localhost:5173,https://meu-site.com
const allowedOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false;

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        ...helmet.contentSecurityPolicy.getDefaultDirectives(),
        // Em desenvolvimento (http://localhost) o upgrade para https atrapalharia.
        'upgrade-insecure-requests': process.env.NODE_ENV === 'production' ? [] : null,
      },
    },
  }),
);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: '1mb' }));

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use('/categories', authenticate, categoryRoutes);
app.use('/accounts', authenticate, accountRoutes);
app.use('/transactions', authenticate, transactionRoutes);
app.use('/debts', authenticate, debtRoutes);
app.use('/investments', authenticate, investmentRoutes);
app.use('/notes', authenticate, noteRoutes);

// Interface web (arquivos estáticos).
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/cards', authenticate, cardRoutes);

app.use('/budgets', authenticate, budgetRoutes);

app.use('/export', authenticate, exportRoutes);

app.use('/restore', authenticate, restoreRoutes);

app.use('/imports', authenticate, importRoutes);

app.use('/reports', authenticate, reportRoutes);

app.use('/recurring', authenticate, recurringRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
