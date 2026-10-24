const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/budgetController');

const router = Router();

router.get('/status', asyncHandler(controller.status));
router.put('/:categoryId', asyncHandler(controller.upsert));
router.delete('/:categoryId', asyncHandler(controller.remove));

module.exports = router;
