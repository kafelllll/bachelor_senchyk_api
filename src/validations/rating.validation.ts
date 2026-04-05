import { z } from 'zod';

export const createRatingSchema = z.object({
  body: z.object({
    exchangeId: z.string().uuid('Exchange id must be a valid UUID'),
    toUserId: z.string().uuid('User id must be a valid UUID').optional(),
    score: z.number().int().min(1, 'Score must be between 1 and 5').max(5, 'Score must be between 1 and 5'),
    comment: z.string().trim().max(1000, 'Comment must be at most 1000 characters').optional(),
  }),
});
