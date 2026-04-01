import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAnnouncement, deleteAnnouncement, getAnnouncement, getAnnouncements, getMyAnnouncements, updateAnnouncement } from '../controllers/announcement.controller.js';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validations/announcement.validation.js';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.get('/me', authenticate, getMyAnnouncements);
router.get('/:id', authenticate, getAnnouncement);
router.post('/', authenticate, validate(createAnnouncementSchema), createAnnouncement);
router.delete('/:id', authenticate, deleteAnnouncement);
router.post('/delete', authenticate, deleteAnnouncement);
router.patch('/:id', authenticate, validate(updateAnnouncementSchema), updateAnnouncement);
router.put('/:id', authenticate, validate(updateAnnouncementSchema), updateAnnouncement);

export default router;
