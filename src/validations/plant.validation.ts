import { z } from 'zod';

export const plantSearchSchema = z.object({
  query: z.object({
    commonName: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
  }),
}).refine((data) => Boolean(data.query.commonName || data.query.name), {
  message: 'commonName or name is required',
  path: ['query'],
});

const plantIdentifyBodySchema = z.object({
  imageBase64: z.string().min(1).optional(),
  images: z.array(z.string().min(1)).optional(),
  similarImages: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  datetime: z.string().min(1).optional(),
  customId: z.number().int().optional(),
  health: z.enum(['only', 'auto', 'all']).optional(),
  diseaseLevel: z.enum(['all', 'general']).optional(),
  classificationLevel: z.enum(['species', 'all', 'genus']).optional(),
  classificationRaw: z.boolean().optional(),
  symptoms: z.boolean().optional(),
  suggestionFilter: z
    .object({
      classification: z.string().min(1),
    })
    .optional(),
  modifiers: z.array(z.string().min(1)).optional(),
});

export const plantIdentifySchema = z
  .object({
    body: z.preprocess((value) => {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if ('imageBase64' in record || 'images' in record) {
          return record;
        }
        if ('body' in record && typeof record.body === 'object') {
          return record.body as Record<string, unknown>;
        }
      }
      return value;
    }, plantIdentifyBodySchema),
  })
  .refine((data) => Boolean(data.body.imageBase64 || (data.body.images && data.body.images.length > 0)), {
    message: 'imageBase64 or images is required',
    path: ['body'],
  });
