const express = require('express');
const controller = require('../controllers/documentController');

const router = express.Router();

router.post('/upload', controller.validateUser, controller.receiveUpload, controller.upload);
router.get('/documents', controller.validateUser, controller.list);
router.get('/documents/:id/download', controller.validateUser, controller.download);
router.use(controller.handleError);

module.exports = router;