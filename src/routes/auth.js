const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/authController');

const router = Router();

router.post('/register', asyncHandler(controller.register));

module.exports = router;
