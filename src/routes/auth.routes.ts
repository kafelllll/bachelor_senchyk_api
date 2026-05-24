import { Router } from 'express';
import {
	register,
	login,
	logout,
	getMe,
	verifyEmail,
	verifyEmailFromBody,
	resendVerificationEmail,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import {
	registerSchema,
	loginSchema,
	verifyEmailSchema,
	resendVerificationSchema,
} from '../validations/auth.validation.js';

const router = Router();
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/verify-email', verifyEmail);
router.post('/verify-email', validate(verifyEmailSchema), verifyEmailFromBody);
router.post('/resend-verification', validate(resendVerificationSchema), resendVerificationEmail);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, getMe);
export default router;

