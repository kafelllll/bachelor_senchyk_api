import { createExchangeSchema, updateExchangeStatusSchema } from '../validations/exchange.validation.js';
import type { z } from 'zod';

export type CreateExchangeInput = z.infer<typeof createExchangeSchema>['body'];
export type UpdateExchangeStatusInput = z.infer<typeof updateExchangeStatusSchema>['body'];
