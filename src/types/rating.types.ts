import { createRatingSchema } from '../validations/rating.validation.js';
import type { z } from 'zod';

export type CreateRatingInput = z.infer<typeof createRatingSchema>['body'];
