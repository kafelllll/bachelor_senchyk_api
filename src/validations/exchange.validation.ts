import { z } from 'zod';

export const exchangeStatusValues = ['pending', 'accepted', 'completed', 'cancelled'] as const;

export const createExchangeSchema = z.object({
  body: z.object({
    announcementId: z.string().uuid('Announcement id must be a valid UUID'),
    receiverId: z.string().uuid('Receiver id must be a valid UUID').optional(),
  }),
});

export const updateExchangeStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Exchange id must be a valid UUID'),
  }),
  body: z.object({
    status: z.enum(exchangeStatusValues, { message: 'Invalid exchange status' }),
  }),
});
