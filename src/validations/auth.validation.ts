import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z
      .string({ message: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .refine((val) => val.length > 0, 'Name cannot be only spaces'),
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .email('Not a valid email'),
    password: z
      .string({ message: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long')
      .refine((val) => val.trim().length > 0, 'Password cannot be only spaces'),
    confirmPassword: z
      .string({ message: 'Confirm password is required' })
      .refine((val) => val.trim().length > 0, 'Confirm password cannot be only spaces'),
    termsAccepted: z.boolean({ message: 'Terms must be accepted' }).refine((val) => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ message: 'Email is required' })
      .trim()
      .email('Not a valid email'),
    password: z
      .string({ message: 'Password is required' })
      .refine((val) => val.trim().length > 0, 'Password cannot be only spaces'),
  }),
});
