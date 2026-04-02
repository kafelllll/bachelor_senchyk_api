import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthRequest } from './auth.middleware.js';

type RateLimitedRequest = Request & {
  rateLimit?: {
    resetTime?: number;
  };
};

/**
 * Кастомний keyGenerator, який використовує userId якщо доступний, інакше IP
 */
const createKeyGenerator = () => {
  return (req: Request) => {
    // Якщо це авторизований користувач, використовуємо userId
    const authReq = req as AuthRequest;
    if (authReq.user?.id) {
      return authReq.user.id;
    }
    // Інакше використовуємо IP
    return req.ip ?? 'unknown';
  };
};

/**
 * Rate limiter для створення оглошень
 * Обмеження: максимум 5 оглошень за 15 хвилин на користувача
 */
export const createAnnouncementLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 хвилин
  max: 5, // Максимум 5 оглошень за вікно
  message: 'Too many announcements created. You can create maximum 5 announcements per 15 minutes. Please try again later.',
  standardHeaders: true, // Повертає RateLimit-* headers
  legacyHeaders: false, // Вимикає X-RateLimit-* headers
  skip: (req) => {
    // Пропускаємо rate limiting для admin користувачів (опціонально)
    const authReq = req as AuthRequest;
    return authReq.user?.role === 'admin';
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
      message: 'Too many announcements created. You can create maximum 5 announcements per 15 minutes. Please try again later.',
      retryAfter,
    });
  },
});

/**
 * Rate limiter для видалення оглошень
 * Обмеження: максимум 10 видалень за 1 годину
 */
export const deleteAnnouncementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 10, // Максимум 10 видалень за вікно
  message: 'Too many announcements deleted. Please try again later.',
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
      message: 'Too many announcements deleted. Please try again later.',
      retryAfter,
    });
  },
});

/**
 * Rate limiter для оновлення оглошень
 * Обмеження: максимум 20 оновлень за 1 годину
 */
export const updateAnnouncementLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 година
  max: 20, // Максимум 20 оновлень за вікно
  message: 'Too many announcements updated. Please try again later.',
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
