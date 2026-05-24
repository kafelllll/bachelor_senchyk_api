import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Ім’я є обов’язковим' })
      .trim()
      .min(2, 'Ім’я має містити щонайменше 2 символи')
      .refine((val) => val.length > 0, 'Ім’я не може складатися лише з пробілів'),
    email: z
      .string({ message: 'Електронна адреса є обов’язковою' })
      .trim()
      .email('Некоректна електронна адреса'),
    password: z
      .string({ message: 'Пароль є обов’язковим' })
      .min(6, 'Пароль має містити щонайменше 6 символів')
      .refine((val) => val.trim().length > 0, 'Пароль не може складатися лише з пробілів'),
    confirmPassword: z
      .string({ message: 'Підтвердження пароля є обов’язковим' })
      .refine((val) => val.trim().length > 0, 'Підтвердження пароля не може складатися лише з пробілів'),
    termsAccepted: z.boolean({ message: 'Потрібно прийняти умови' }).refine((val) => val === true, {
      message: 'Ви повинні прийняти умови та положення',
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Паролі не збігаються",
    path: ["confirmPassword"],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: 'Електронна адреса є обов’язковою' })
      .trim()
      .email('Некоректна електронна адреса'),
    password: z
      .string({ message: 'Пароль є обов’язковим' })
      .refine((val) => val.trim().length > 0, 'Пароль не може складатися лише з пробілів'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z
      .string()
      .trim()
      .min(1, 'Токен підтвердження є обов’язковим')
      .optional(),
    code: z
      .string()
      .trim()
      .min(1, 'Код підтвердження є обов’язковим')
      .optional(),
  }).refine((data) => Boolean(data.token || data.code), {
    message: 'Токен підтвердження є обов’язковим',
    path: ['token'],
  }),
});

export const resendVerificationSchema = z.object({
  body: z.object({
    email: z
      .string({ message: 'Електронна адреса є обов’язковою' })
      .trim()
      .email('Некоректна електронна адреса'),
  }),
});
