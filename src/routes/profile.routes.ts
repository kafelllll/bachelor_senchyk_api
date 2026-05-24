import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { getMyProfile, getUserProfile, updateMyProfile, deleteMyProfile } from '../controllers/profile.controller.js';
import { updateProfileSchema } from '../validations/profile.validation.js';

const router = Router();

router.get('/me', authenticate, getMyProfile);
router.get('/:id', getUserProfile);
router.patch('/me', authenticate, validate(updateProfileSchema), updateMyProfile);
router.delete('/me', authenticate, deleteMyProfile);
export default router;
