const express = require('express');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const authenticate = require('./middlewares/authenticate');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());

app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use('/categories', authenticate, categoryRoutes);
app.use('/accounts', authenticate, accountRoutes);
app.use('/transactions', authenticate, transactionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
