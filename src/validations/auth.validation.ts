import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string({ message: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
    email: z.string({ message: 'Email is required' }).email('Not a valid email'),
    password: z
      .string({ message: 'Password is required' })
      .min(6, 'Password must be at least 6 characters long'),
    confirmPassword: z.string({ message: 'Confirm password is required' }),
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
    email: z.string({ message: 'Email is required' }).email('Not a valid email'),
    password: z.string({ message: 'Password is required' }),
  }),
});
