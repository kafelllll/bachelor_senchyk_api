import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import type { ZodSchema } from 'zod';

type PlainObject = Record<string, unknown>;

const updateObject = (target: PlainObject, source: PlainObject) => {
  Object.keys(target).forEach((key) => {
    if (!(key in source)) {
      delete target[key];
    }
  });

  Object.entries(source).forEach(([key, value]) => {
    target[key] = value;
  });
};

export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      if (parsed && typeof parsed === 'object') {
        const payload = parsed as { body?: unknown; query?: unknown; params?: unknown };
        if (payload.body !== undefined) {
          req.body = payload.body as Request['body'];
        }
        if (
          payload.query !== undefined &&
          req.query &&
          typeof req.query === 'object' &&
          !Array.isArray(req.query)
        ) {
          const source =
            payload.query && typeof payload.query === 'object' && !Array.isArray(payload.query)
              ? (payload.query as PlainObject)
              : {};
          updateObject(req.query as PlainObject, source);
        }
        if (
          payload.params !== undefined &&
          req.params &&
          typeof req.params === 'object' &&
          !Array.isArray(req.params)
        ) {
          const source =
            payload.params && typeof payload.params === 'object' && !Array.isArray(payload.params)
              ? (payload.params as PlainObject)
              : {};
          updateObject(req.params as PlainObject, source);
        }
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          message: 'Validation failed',
          errors: error.issues,
        });
        return;
      }
      next(error);
    }
  };

