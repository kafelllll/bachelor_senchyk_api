import { registerSchema, loginSchema, verifyEmailSchema, resendVerificationSchema } from '../validations/auth.validation.js';
import type { z } from 'zod';
export type RegisterUserInput = z.infer<typeof registerSchema>['body'];
export type LoginUserInput = z.infer<typeof loginSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ResendVerificationInput = z.infer<typeof resendVerificationSchema>['body'];
