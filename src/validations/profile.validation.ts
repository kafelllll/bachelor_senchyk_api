import { z } from 'zod';

const isWhitespaceOnly = (str: string) => str.trim().length === 0;

export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Ім’я має містити щонайменше 2 символи')
      .max(100, 'Ім’я має містити не більше 100 символів')
      .refine(val => !isWhitespaceOnly(val), 'Ім’я не може складатися лише з пробілів')
      .optional(),
    avatar: z
      .string()
      .url('Аватар має бути коректним URL')
      .nullable()
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'Місто має містити щонайменше 2 символи')
      .max(80, 'Місто має містити не більше 80 символів')
      .refine(val => !isWhitespaceOnly(val), 'Місто не може складатися лише з пробілів')
      .optional(),
    bio: z
      .string()
      .trim()
      .max(500, 'Біографія має містити не більше 500 символів')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Потрібно передати щонайменше одне поле',
    path: ['body'],
  }),
});