const path = require('node:path');
const multer = require('multer');
const service = require('../services/documentService');

const receiveUpload = multer(service.getUploadOptions()).single('file');

function validateUser(req, res, next) {
  const owner = req.get('X-User-Id');
  if (!owner || !owner.trim() || owner.length > 100) {
    return res.status(400).json({
      error: { code: 'INVALID_USER_ID', message: 'Informe X-User-Id com 1 a 100 caracteres.' },
    });
  }
  req.owner = owner.trim();
  next();
}

async function upload(req, res) {
  const document = await service.uploadDocument(req.file, req.owner);
  res.status(201).json({ document });
}

function list(req, res) {
  res.json({ documents: service.listDocuments(req.owner) });
}

function download(req, res, next) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(req.params.id)) {
    return res.status(400).json({
      error: { code: 'INVALID_DOCUMENT_ID', message: 'Identificador de documento invalido.' },
    });
  }
  const document = service.getDocumentDownload(req.params.id, req.owner);
  res.type(path.extname(document.originalName) || 'bin');
  res.download(document.filePath, document.originalName, (error) => {
    if (error) next(error);
  });
}

function handleError(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error instanceof multer.MulterError) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    return res.status(tooLarge ? 413 : 400).json({
      error: {
        code: tooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
        message: tooLarge ? 'O arquivo excede o limite permitido.' : 'Envie exatamente um arquivo no campo file.',
      },
    });
  }

  const expected = ['FILE_REQUIRED', 'EMPTY_FILE', 'FILE_TOO_LARGE', 'DOCUMENT_NOT_FOUND'].includes(error.code);
  res.status(expected ? error.status : 500).json({
    error: {
      code: expected ? error.code : 'INTERNAL_ERROR',
      message: expected ? error.message : 'Nao foi possivel concluir a operacao.',
    },
  });
}

module.exports = { validateUser, receiveUpload, upload, list, download, handleError };