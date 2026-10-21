const express = require('express');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const accountRoutes = require('./routes/accounts');
const transactionRoutes = require('./routes/transactions');
const currentUser = require('./middlewares/currentUser');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use('/health', healthRoutes);
app.use('/auth', authRoutes);

app.use(currentUser);
app.use('/categories', categoryRoutes);
app.use('/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
