import { z } from 'zod';

export const createRatingSchema = z.object({
  body: z.object({
    exchangeId: z.string().uuid('ID обміну має бути коректним UUID'),
    toUserId: z.string().uuid('ID користувача має бути коректним UUID').optional(),
    score: z.number().int().min(1, 'Оцінка має бути від 1 до 5').max(5, 'Оцінка має бути від 1 до 5'),
    comment: z.string().trim().max(1000, 'Коментар має містити не більше 1000 символів').optional(),
  }),
});