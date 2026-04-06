import type { ErrorRequestHandler } from 'express';
import { logger } from '../utils/logger.js';

const isHttpError = (error: unknown): error is { status?: number; statusCode?: number; message?: string } => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  return 'status' in error || 'statusCode' in error || 'message' in error;
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const status = isHttpError(err)
    ? Number(err.status ?? err.statusCode ?? 500)
    : 500;

  const message = isHttpError(err) && err.message
    ? err.message
    : 'Server error';

  if (process.env.NODE_ENV !== 'test') {
    logger.error('Unhandled error', { err });
  }

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { error: err } : {}),
  });
};
