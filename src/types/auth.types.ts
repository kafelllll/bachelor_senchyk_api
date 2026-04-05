import { registerSchema, loginSchema } from '../validations/auth.validation.js';
import type { z } from 'zod';

export type RegisterUserInput = z.infer<typeof registerSchema>['body'];
export type LoginUserInput = z.infer<typeof loginSchema>['body'];
