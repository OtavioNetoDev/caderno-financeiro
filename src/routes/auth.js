const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authenticate = require('../middlewares/authenticate');
const { authLimiter } = require('../middlewares/rateLimiters');
const controller = require('../controllers/authController');

const router = Router();

router.post('/register', authLimiter, asyncHandler(controller.register));
router.post('/login', authLimiter, asyncHandler(controller.login));
router.post('/forgot-password', authLimiter, asyncHandler(controller.forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(controller.resetPassword));
router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
