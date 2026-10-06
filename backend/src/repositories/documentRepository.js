const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();
const storageFilenamePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const uploadStorage = multer.diskStorage({
  destination(req, file, callback) {
    fs.mkdir(storageDirectory, { recursive: true }, (error) => {
      callback(error, storageDirectory);
    });
  },
  filename(req, file, callback) {
    callback(null, randomUUID());
  },
});

function save(document) {
  documents.set(document.id, document);
  return document;
}

function findById(id) {
  return documents.get(id);
}

function findByOwner(owner) {
  return Array.from(documents.values()).filter((document) => document.owner === owner);
}

function getFilePath(filename) {
  if (typeof filename !== 'string' || !storageFilenamePattern.test(filename)) {
    throw new Error('Nome interno de arquivo invalido.');
  }
  const filePath = path.resolve(storageDirectory, filename);
  if (!filePath.startsWith(`${storageDirectory}${path.sep}`)) {
    throw new Error('Caminho de arquivo fora do armazenamento permitido.');
  }
  return filePath;
}

async function removeFile(filename) {
  await fs.promises.unlink(getFilePath(filename));
}

module.exports = { uploadStorage, save, findById, findByOwner, getFilePath, removeFile };