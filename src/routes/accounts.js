const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/accountController');

const router = Router();

router.get('/', asyncHandler(controller.list));
// "/balances" precisa vir antes de "/:id".
router.get('/balances', asyncHandler(controller.balances));
router.post('/', asyncHandler(controller.create));
router.get('/:id', asyncHandler(controller.getOne));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));

module.exports = router;
