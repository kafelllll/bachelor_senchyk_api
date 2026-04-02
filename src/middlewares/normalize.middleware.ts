import type { Request, Response, NextFunction } from 'express';

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

const normalizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeValue(item))
      .filter((item) => item !== undefined);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value as PlainObject).reduce<PlainObject>((acc, [key, item]) => {
      const normalized = normalizeValue(item);
      if (normalized !== undefined) {
        acc[key] = normalized;
      }
      return acc;
    }, {});
  }

  return value;
};

export const normalizeRequestStrings = (req: Request, _res: Response, next: NextFunction): void => {
  req.body = normalizeValue(req.body) as Request['body'];

  const normalizedQuery = normalizeValue(req.query);
  if (req.query && typeof req.query === 'object' && !Array.isArray(req.query)) {
    const source =
      normalizedQuery && typeof normalizedQuery === 'object' && !Array.isArray(normalizedQuery)
        ? (normalizedQuery as PlainObject)
        : {};
    updateObject(req.query as PlainObject, source);
  }

  const normalizedParams = normalizeValue(req.params);
  if (req.params && typeof req.params === 'object' && !Array.isArray(req.params)) {
    const source =
      normalizedParams && typeof normalizedParams === 'object' && !Array.isArray(normalizedParams)
        ? (normalizedParams as PlainObject)
        : {};
    updateObject(req.params as PlainObject, source);
  }
  next();
};
