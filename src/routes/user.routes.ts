import { Router } from 'express';
import { getUser } from '../controllers/user.controller.js';

const router = Router();

// Public route to get user by ID
router.get('/:id', getUser);

export default router;
