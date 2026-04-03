import { registerSchema, loginSchema } from '../validations/auth.validation.js';

export type RegisterUserInput = typeof registerSchema.shape.body._type;
export type LoginUserInput = typeof loginSchema.shape.body._type;
