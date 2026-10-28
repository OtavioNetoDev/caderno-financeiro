const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/reportController');

const router = Router();

router.get('/monthly', asyncHandler(controller.monthly));
router.get('/daily', asyncHandler(controller.daily));
router.get('/breakdown', asyncHandler(controller.breakdown));

module.exports = router;
