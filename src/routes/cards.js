const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/cardController');

const router = Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.get('/:id/charges', asyncHandler(controller.listCharges));
router.post('/:id/charges', asyncHandler(controller.createCharge));
router.delete('/:id/charges/:chargeId', asyncHandler(controller.removeCharge));
router.get('/:id/invoices/:month', asyncHandler(controller.getInvoice));
router.put('/:id/invoices/:month', asyncHandler(controller.setBilled));
router.post('/:id/invoices/:month/pay', asyncHandler(controller.payInvoice));

module.exports = router;
