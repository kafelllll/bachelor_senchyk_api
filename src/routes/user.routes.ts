import { Router } from 'express';
import { getUser } from '../controllers/user.controller.js';
import { getRatingsSummary } from '../controllers/rating.controller.js';

const router = Router();
router.get('/:id/ratings-summary', getRatingsSummary);
router.get('/:id', getUser);
export default router;

