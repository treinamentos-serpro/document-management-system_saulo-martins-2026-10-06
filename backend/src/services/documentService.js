const { randomUUID } = require('node:crypto');
const repository = require('../repositories/documentRepository');

const maxFileSize = Number(process.env.MAX_FILE_SIZE_BYTES || 10485760);
if (!Number.isSafeInteger(maxFileSize) || maxFileSize <= 0) {
  throw new Error('MAX_FILE_SIZE_BYTES deve ser um inteiro positivo.');
}

function createError(status, code, message) {
  return Object.assign(new Error(message), { status, code });
}

function publicMetadata(document) {
  const { id, originalName, size, uploadedAt, owner } = document;
  return { id, originalName, size, uploadedAt, owner };
}

async function uploadDocument(file, owner) {
  if (!file) {
    throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo file.');
  }

  try {
    if (file.size === 0) {
      throw createError(400, 'EMPTY_FILE', 'O arquivo deve ter conteudo.');
    }
    if (file.size > maxFileSize) {
      throw createError(413, 'FILE_TOO_LARGE', 'O arquivo excede o limite permitido.');
    }

    const document = repository.save({
      id: randomUUID(),
      originalName: file.originalname,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      filename: file.filename,
    });
    return publicMetadata(document);
  } catch (error) {
    await repository.removeFile(file.filename);
    throw error;
  }
}

function listDocuments(owner) {
  return repository.findByOwner(owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt))
    .map(publicMetadata);
}

function getDocumentDownload(id, owner) {
  const document = repository.findById(id);
  if (!document || document.owner !== owner) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento nao encontrado.');
  }
  return {
    originalName: document.originalName,
    filePath: repository.getFilePath(document.filename),
  };
}

function getUploadOptions() {
  return { storage: repository.uploadStorage, limits: { fileSize: maxFileSize + 1, files: 1 } };
}

module.exports = { uploadDocument, listDocuments, getDocumentDownload, getUploadOptions };