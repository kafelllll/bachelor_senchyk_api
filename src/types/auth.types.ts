import { z } from 'zod';
import { registerSchema, loginSchema } from '../validations/auth.validation.js';

export type RegisterUserInput = z.infer<typeof registerSchema>['body'];
export type LoginUserInput = z.infer<typeof loginSchema>['body'];
