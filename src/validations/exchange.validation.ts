import { z } from 'zod';

export const exchangeStatusValues = ['pending', 'accepted', 'completed', 'cancelled'] as const;

export const createExchangeSchema = z.object({
  body: z.object({
    announcementId: z.string().uuid('ID оголошення має бути коректним UUID'),
    receiverId: z.string().uuid('ID отримувача має бути коректним UUID').optional(),
    offeredAnnouncementId: z
      .string('Оберіть ваше оголошення, яке пропонуєте в обмін')
      .uuid('ID запропонованого оголошення має бути коректним UUID')
      .optional(),
  }),
});

export const updateExchangeStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID обміну має бути коректним UUID'),
  }),
  body: z.object({
    status: z.enum(exchangeStatusValues, { message: 'Некоректний статус обміну' }),
  }),
});

export const confirmExchangeCompletionSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID обміну має бути коректним UUID'),
  }),
  body: z.object({}).optional(),
});
