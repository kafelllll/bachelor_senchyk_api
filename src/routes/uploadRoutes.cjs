const { Router } = require('express');
const { getUploadUrl } = require('../controllers/uploadController.cjs');

const router = Router();

router.post('/presigned-url', getUploadUrl);

module.exports = router;
