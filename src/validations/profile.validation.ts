import { z } from 'zod';

const isWhitespaceOnly = (str: string) => str.trim().length === 0;

export const updateProfileSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name must be max 100 characters')
      .refine(val => !isWhitespaceOnly(val), 'Name cannot be only spaces')
      .optional(),
    avatar: z
      .string()
      .url('Avatar must be a valid URL')
      .nullable()
      .optional(),
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(80, 'City must be max 80 characters')
      .refine(val => !isWhitespaceOnly(val), 'City cannot be only spaces')
      .optional(),
    bio: z
      .string()
      .trim()
      .max(500, 'Bio must be max 500 characters')
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
    path: ['body'],
  }),
});
