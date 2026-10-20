const { Router } = require('express');
const mongoose = require('mongoose');

const router = Router();

router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'caderno-financeiro',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
  });
});

module.exports = router;
