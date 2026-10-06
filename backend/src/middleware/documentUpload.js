const multer = require('multer');
const repository = require('../repositories/documentRepository');
const service = require('../services/documentService');

module.exports = multer({
  storage: repository.uploadStorage,
  limits: { fileSize: service.maxFileSizeBytes + 1, files: 1, fields: 0, parts: 2 },
}).single('file');