import { z } from 'zod';

const categoryValues = ['indoor', 'succulent', 'other'] as const;
const sizeValues = ['small', 'medium', 'large'] as const;
const conditionValues = ['healthy', 'needs-care'] as const;
const careLevelValues = ['easy', 'medium', 'hard'] as const;

export const createAnnouncementSchema = z.object({
  body: z.object({
    plantName: z.string({ message: 'Plant name is required' }).min(1, 'Plant name is required'),
    category: z.enum(categoryValues, { message: 'Category is required' }),
    size: z.enum(sizeValues, { message: 'Size is required' }),
    condition: z.enum(conditionValues, { message: 'Condition is required' }),
    careLevel: z.enum(careLevelValues, { message: 'Care level is required' }),
    city: z.string({ message: 'City is required' }).min(1, 'City is required'),
    genus: z.string({ message: 'Genus is required' }).min(1, 'Genus is required'),
    family: z.string({ message: 'Family is required' }).min(1, 'Family is required'),
    commonName: z.string({ message: 'Common name is required' }).min(1, 'Common name is required'),
    description: z.string().min(1).optional(),
    additionalTags: z.array(z.string().min(1)).optional(),
    district: z.string().min(1).optional(),
    pestFree: z.boolean().optional(),
    readyToExchange: z.boolean().optional(),
  }),
});
