const express = require('express');
const controller = require('../controllers/documentController');
const receiveUpload = require('../middleware/documentUpload');

const router = express.Router();

router.post('/upload', controller.validateUser, receiveUpload, controller.upload);
router.get('/documents', controller.validateUser, controller.list);
router.get('/documents/:id/download', controller.validateUser, controller.download);

module.exports = router;