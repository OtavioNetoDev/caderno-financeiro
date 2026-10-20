const express = require('express');
const healthRoutes = require('./routes/health');
const categoryRoutes = require('./routes/categories');
const currentUser = require('./middlewares/currentUser');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use('/health', healthRoutes);

app.use(currentUser);
app.use('/categories', categoryRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
