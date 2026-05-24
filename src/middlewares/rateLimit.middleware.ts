import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthRequest } from './auth.middleware.js';

type RateLimitedRequest = Request & {
  rateLimit?: {
    resetTime?: number;
  };
};

const createKeyGenerator = () => {
  return (req: Request) => {
    const authReq = req as AuthRequest;
    if (authReq.user?.id) {
      return authReq.user.id;
    }
    return req.ip ? ipKeyGenerator(req.ip) : 'unknown';
  };
};

export const createAnnouncementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Занадто багато оголошень створено. Ви можете створити максимум 5 оголошень за 15 хвилин. Будь ласка, спробуйте пізніше.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return false;
  },
  keyGenerator: createKeyGenerator(),
  handler: (req, res) => {
    const request = req as RateLimitedRequest;
    const retryAfter = request.rateLimit?.resetTime
      ? Math.ceil((request.rateLimit.resetTime - Date.now()) / 1000)
      : 900;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      message: 'Занадто багато оголошень створено. Ви можете створити максимум 5 оголошень за 15 хвилин. Будь ласка, спробуйте пізніше.',
      retryAfter,
    });
  },
});

export const deleteAnnouncementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Занадто багато оголошень видалено. Будь ласка, спробуйте пізніше.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator(),
  handler: (req, res) => {
    const request = req as RateLimitedRequest;
    const retryAfter = request.rateLimit?.resetTime
      ? Math.ceil((request.rateLimit.resetTime - Date.now()) / 1000)
      : 3600;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      message: 'Занадто багато оголошень видалено. Будь ласка, спробуйте пізніше.',
      retryAfter,
    });
  },
});

export const updateAnnouncementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Занадто багато оголошень оновлено. Будь ласка, спробуйте пізніше.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: createKeyGenerator(),
  handler: (req, res) => {
    const request = req as RateLimitedRequest;
    const retryAfter = request.rateLimit?.resetTime
      ? Math.ceil((request.rateLimit.resetTime - Date.now()) / 1000)
      : 3600;
    res.set('Retry-After', String(retryAfter));
    res.status(429).json({
      success: false,
      message: 'Too many announcements updated. Please try again later.',
      retryAfter,
    });
  },
});

