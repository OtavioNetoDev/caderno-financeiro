const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/exportController');

const router = Router();

router.get('/transactions.csv', asyncHandler(controller.transactionsCsv));
router.get('/backup.json', asyncHandler(controller.backup));

module.exports = router;
