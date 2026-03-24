import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAnnouncement } from '../controllers/announcement.controller.js';
import { createAnnouncementSchema } from '../validations/announcement.validation.js';

const router = Router();

router.post('/', authenticate, validate(createAnnouncementSchema), createAnnouncement);

export default router;
