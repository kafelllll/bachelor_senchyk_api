import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { 
  createAnnouncementLimiter, 
  deleteAnnouncementLimiter, 
  updateAnnouncementLimiter 
} from '../middlewares/rateLimit.middleware.js';
import { createAnnouncement, deleteAnnouncement, getAnnouncement, getAnnouncementMatches, getAnnouncements, getMyAnnouncements, getUserAnnouncementMatches, updateAnnouncement } from '../controllers/announcement.controller.js';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validations/announcement.validation.js';

const router = Router();

router.get('/', authenticate, getAnnouncements);
router.get('/me', authenticate, getMyAnnouncements);
router.get('/recommendations', authenticate, getUserAnnouncementMatches);
router.get('/:id/matches', authenticate, getAnnouncementMatches);
router.get('/:id', authenticate, getAnnouncement);
router.post('/', authenticate, createAnnouncementLimiter, validate(createAnnouncementSchema), createAnnouncement);
router.delete('/:id', authenticate, deleteAnnouncementLimiter, deleteAnnouncement);
router.post('/delete', authenticate, deleteAnnouncementLimiter, deleteAnnouncement);
router.patch('/:id', authenticate, updateAnnouncementLimiter, validate(updateAnnouncementSchema), updateAnnouncement);
router.put('/:id', authenticate, updateAnnouncementLimiter, validate(updateAnnouncementSchema), updateAnnouncement);

export default router;
