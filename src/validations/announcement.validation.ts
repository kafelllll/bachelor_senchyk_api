import { z } from 'zod';

const categoryValues = ['indoor', 'succulent', 'other'] as const;
const sizeValues = ['small', 'medium', 'large'] as const;
const conditionValues = ['healthy', 'needs-care'] as const;
const careLevelValues = ['easy', 'medium', 'hard'] as const;
const offerTypeValues = ['offer', 'request'] as const;

export const createAnnouncementSchema = z.object({
  body: z.object({
    plantName: z.string({ message: 'Plant name is required' }).min(1, 'Plant name is required').optional(),
    offerType: z.enum(offerTypeValues, { message: 'Offer type is required' }),
    category: z.enum(categoryValues, { message: 'Category is required' }),
    size: z.enum(sizeValues, { message: 'Size is required' }),
    condition: z.enum(conditionValues, { message: 'Condition is required' }),
    careLevel: z.enum(careLevelValues, { message: 'Care level is required' }),
    city: z.string({ message: 'City is required' }).min(1, 'City is required'),
    genus: z.string({ message: 'Genus is required' }).min(1, 'Genus is required').optional(),
    family: z.string({ message: 'Family is required' }).min(1, 'Family is required').optional(),
    commonName: z.string({ message: 'Common name is required' }).min(1, 'Common name is required').optional(),
    plantResult: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(1).optional(),
        common_name: z.string().min(1).optional(),
        commonName: z.string().min(1).optional(),
        scientific_name: z.string().min(1).optional(),
        scientificName: z.string().min(1).optional(),
        genus: z.string().min(1).optional(),
        family: z.string().min(1).optional(),
      })
      .optional(),
    primary: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(1).optional(),
        common_name: z.string().min(1).optional(),
        commonName: z.string().min(1).optional(),
        scientific_name: z.string().min(1).optional(),
        scientificName: z.string().min(1).optional(),
        genus: z.string().min(1).optional(),
        family: z.string().min(1).optional(),
      })
      .optional(),
    plant: z
      .object({
        id: z.union([z.string(), z.number()]).optional(),
        name: z.string().min(1).optional(),
        common_name: z.string().min(1).optional(),
        commonName: z.string().min(1).optional(),
        scientific_name: z.string().min(1).optional(),
        scientificName: z.string().min(1).optional(),
        genus: z.string().min(1).optional(),
        family: z.string().min(1).optional(),
      })
      .optional(),
    photoResult: z.unknown().optional(),
    suggestion: z.unknown().optional(),
    result: z.unknown().optional(),
    description: z.string().min(1).optional(),
    photo: z.string().min(1).optional(),
    photoBase64: z.string().min(1).optional(),
    additionalTags: z.array(z.string().min(1)).optional(),
    district: z.string().min(1).optional(),
    pestFree: z.boolean().optional(),
    readyToExchange: z.boolean().optional(),
  }).refine((data) => {
    const hasDirect = Boolean(data.plantName || data.commonName || data.genus || data.family);
    const resultSources = [data.plantResult, data.primary, data.plant, data.photoResult, data.suggestion, data.result];
    const hasResult = resultSources.some((source) => Boolean(
      (source as any)?.name ||
      (source as any)?.common_name ||
      (source as any)?.commonName ||
      (source as any)?.scientific_name ||
      (source as any)?.scientificName ||
      (source as any)?.genus ||
      (source as any)?.family,
    ));
    return hasDirect || hasResult;
  }, {
    message: 'Plant data is required',
    path: ['plantName'],
  }),
});
