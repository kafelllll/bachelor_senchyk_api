import { z } from 'zod';

const isWhitespaceOnly = (value: string) => value.trim().length === 0;

export const createMessageSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid('Receiver id must be a valid UUID'),
    announcementId: z.string().uuid('Announcement id must be a valid UUID').nullable().optional(),
    content: z
      .string({ message: 'Message content is required' })
      .trim()
      .min(1, 'Message content cannot be empty')
      .max(2000, 'Message content must be at most 2000 characters')
      .refine((value) => !isWhitespaceOnly(value), 'Message content cannot be only spaces'),
  }),
});

export const getMessagesSchema = z.object({
  query: z.object({
    userId: z.string().uuid('User id must be a valid UUID'),
    announcementId: z.string().uuid('Announcement id must be a valid UUID').nullable().optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
});

export const getConversationsSchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().min(1).max(200).optional(),
  }),
});

export const deleteConversationSchema = z.object({
  query: z.object({
    userId: z.string().uuid('User id must be a valid UUID'),
    announcementId: z.string().uuid('Announcement id must be a valid UUID').nullable().optional(),
  }),
});
