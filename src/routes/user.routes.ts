import { Router } from 'express';
import { getUser } from '../controllers/user.controller.js';
import { getRatingsSummary } from '../controllers/rating.controller.js';

const router = Router();

// Public route to get user by ID
router.get('/:id/ratings-summary', getRatingsSummary);
router.get('/:id', getUser);

export default router;
