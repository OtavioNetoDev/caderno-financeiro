const express = require('express');
const healthRoutes = require('./routes/health');
const currentUser = require('./middlewares/currentUser');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(express.json());
app.use('/health', healthRoutes);

app.use(currentUser);
// As rotas autenticadas entram aqui.

app.use(notFound);
app.use(errorHandler);

module.exports = app;
