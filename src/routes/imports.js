const { Router } = require('express');
const multer = require('multer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { EXTENSIONS, formatOf } = require('../importers');
const controller = require('../controllers/importController');
const batches = require('../controllers/importBatchController');

// O arquivo fica só na memória (nada é gravado em disco), com limite de 5 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    if (formatOf(file.originalname)) {
      return cb(null, true);
    }
    return cb(
      new AppError(400, `Formato não suportado. Use: ${Object.keys(EXTENSIONS).join(', ')}`),
    );
  },
});

const router = Router();

router.get('/formats', asyncHandler(controller.formats));
router.post('/preview', upload.single('file'), asyncHandler(controller.preview));
router.post('/confirm', asyncHandler(batches.confirm));
router.get('/', asyncHandler(batches.list));
router.delete('/:id', asyncHandler(batches.undo));

module.exports = router;
