import { z } from 'zod';

export const plantSearchSchema = z.object({
  query: z.object({
    commonName: z.string({ message: 'commonName is required' }).min(1, 'commonName is required'),
  }),
});
