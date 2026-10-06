const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const storageDirectory = path.resolve(__dirname, '../../storage');
const documents = new Map();

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
  return path.join(storageDirectory, filename);
}

async function removeFile(filename) {
  await fs.promises.unlink(getFilePath(filename));
}

module.exports = { uploadStorage, save, findById, findByOwner, getFilePath, removeFile };