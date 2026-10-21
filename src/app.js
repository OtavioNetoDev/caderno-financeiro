const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
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
app.use(express.json({ limit: '100kb' }));

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use('/categories', authenticate, categoryRoutes);
app.use('/accounts', authenticate, accountRoutes);
app.use('/transactions', authenticate, transactionRoutes);

// Interface web (arquivos estáticos).
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
