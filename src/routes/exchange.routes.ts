import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createExchange, getExchangeHistory, getMyExchanges, getPendingExchangeCount, updateExchangeStatus } from '../controllers/exchange.controller.js';
import { createExchangeSchema, updateExchangeStatusSchema } from '../validations/exchange.validation.js';

const router = Router();

router.post('/', authenticate, validate(createExchangeSchema), createExchange);
router.patch('/:id/status', authenticate, validate(updateExchangeStatusSchema), updateExchangeStatus);
router.get('/my', authenticate, getMyExchanges);
router.get('/history', authenticate, getExchangeHistory);
router.get('/pending-count', authenticate, getPendingExchangeCount);

export default router;
