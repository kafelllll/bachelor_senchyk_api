import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAnnouncement, deleteAnnouncement, getAnnouncements, getMyAnnouncements } from '../controllers/announcement.controller.js';
import { createAnnouncementSchema } from '../validations/announcement.validation.js';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.get('/me', authenticate, getMyAnnouncements);
router.post('/', authenticate, validate(createAnnouncementSchema), createAnnouncement);
router.delete('/:id', authenticate, deleteAnnouncement);
router.post('/delete', authenticate, deleteAnnouncement);

export default router;
