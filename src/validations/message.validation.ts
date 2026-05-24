import { z } from 'zod';

const isWhitespaceOnly = (value: string) => value.trim().length === 0;

export const createMessageSchema = z.object({
  body: z.object({
    receiverId: z.string().uuid('ID отримувача має бути коректним UUID'),
    announcementId: z.string().uuid('ID оголошення має бути коректним UUID').nullable().optional(),
    content: z
      .string({ message: 'Текст повідомлення є обов’язковим' })
      .trim()
      .min(1, 'Текст повідомлення не може бути порожнім')
      .max(2000, 'Текст повідомлення має містити не більше 2000 символів')
      .refine((value) => !isWhitespaceOnly(value), 'Текст повідомлення не може складатися лише з пробілів'),
  }),
});

export const getMessagesSchema = z.object({
  query: z.object({
    userId: z.string().uuid('ID користувача має бути коректним UUID'),
    announcementId: z.string().uuid('ID оголошення має бути коректним UUID').nullable().optional(),
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
    userId: z.string().uuid('ID користувача має бути коректним UUID'),
    announcementId: z.string().uuid('ID оголошення має бути коректним UUID').nullable().optional(),
  }),
});