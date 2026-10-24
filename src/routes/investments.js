const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/investmentController');

const router = Router();

router.get('/', asyncHandler(controller.list));
router.post('/', asyncHandler(controller.create));
// "/summary" precisa vir antes de "/:id".
router.get('/summary', asyncHandler(controller.summary));
router.get('/:id', asyncHandler(controller.getOne));
router.patch('/:id', asyncHandler(controller.update));
router.delete('/:id', asyncHandler(controller.remove));
router.post('/:id/entries', asyncHandler(controller.addEntry));
router.delete('/:id/entries/:entryId', asyncHandler(controller.removeEntry));

module.exports = router;
