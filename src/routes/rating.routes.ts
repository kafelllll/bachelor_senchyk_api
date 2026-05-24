import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRating } from '../controllers/rating.controller.js';
import { createRatingSchema } from '../validations/rating.validation.js';

const router = Router();

router.post('/', authenticate, validate(createRatingSchema), createRating);
export default router;
