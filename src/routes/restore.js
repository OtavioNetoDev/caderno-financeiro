const { Router } = require('express');
const multer = require('multer');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const controller = require('../controllers/restoreController');

const MAX_BYTES = 20 * 1024 * 1024;

// O arquivo fica só na memória (nada é gravado em disco), com limite de 20 MB.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 3 },
});

function receive(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err && err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError(413, 'Backup grande demais (máximo de 20 MB)'));
    }
    return next(err);
  });
}

const router = Router();

router.post('/', receive, asyncHandler(controller.restore));

module.exports = router;
