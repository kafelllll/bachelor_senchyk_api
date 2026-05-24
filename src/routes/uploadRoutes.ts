import { Router } from 'express';
import { getUploadUrl } from '../controllers/uploadController.js';

const router = Router();

router.post('/presigned-url', getUploadUrl);

export default router;
