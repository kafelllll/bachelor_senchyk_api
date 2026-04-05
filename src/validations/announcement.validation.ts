import { z } from 'zod';

const categoryValues = ['indoor', 'succulent', 'other'] as const;
const sizeValues = ['small', 'medium', 'large'] as const;
const conditionValues = ['healthy', 'needs-care'] as const;
const careLevelValues = ['easy', 'medium', 'hard'] as const;
const offerTypeValues = ['offer', 'looking-for'] as const;
const wateringFreqValues = ['rare', 'moderate', 'frequent'] as const;
const lightReqsValues = ['bright', 'partial', 'shade'] as const;
const humidityValues = ['low', 'medium', 'high'] as const;
const toxicityValues = ['non-toxic', 'slightly-toxic', 'toxic'] as const;
const growthRateValues = ['slow', 'moderate', 'fast'] as const;
const statusValues = ['active', 'pending', 'rejected', 'archived'] as const;

// P0: Security - Sanitization helpers
const isWhitespaceOnly = (str: string) => str.trim().length === 0;

const sanitizeHtml = (html: string) => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');
};

// P1: Data Quality - Normalization helpers
const normalizeCity = (city: string) => {
  return city
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// P1: Validation helpers
const hasLetters = (str: string) => /[a-яA-ZащіїєґёЁ]/i.test(str);

const hasMinWords = (str: string, minWords: number) => {
  const words = str.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length >= minWords;
};

const validateDateInRange = (date: string) => {
  const d = new Date(date);
  const now = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);
  return d > now && d <= maxDate;
};

const plantSourceSchema = z
  .object({
    id: z
      .union([
        z.string().regex(/^\d+$/, 'ID must contain only digits'),
        z.number().int().gte(0, 'ID must be non-negative'),
      ])
      .optional(),
    name: z.string().min(1).optional(),
    common_name: z.string().min(1).optional(),
    commonName: z.string().min(1).optional(),
    scientific_name: z.string().min(1).optional(),
    scientificName: z.string().min(1).optional(),
    genus: z.string().min(1).optional(),
    family: z.string().min(1).optional(),
  })
  .optional();

const hasOfferCaseConflicts = (data: Record<string, unknown>) => {
  if (data.offerType && (data as any).offer_type && data.offerType !== (data as any).offer_type) {
    return true;
  }
  if (data.careLevel && (data as any).care_level && data.careLevel !== (data as any).care_level) {
    return true;
  }
  return false;
};


const hasPlantResult = (sources: Array<unknown>) => {
  return sources.some((source) => Boolean(
    (source as any)?.name ||
    (source as any)?.common_name ||
    (source as any)?.commonName ||
    (source as any)?.scientific_name ||
    (source as any)?.scientificName ||
    (source as any)?.genus ||
    (source as any)?.family,
  ));
};

export const createAnnouncementSchema = z.object({
  body: z.object({
    // Plant identification - required
    plantName: z
      .string({ message: 'Plant name is required' })
      .trim()
      .min(1, 'Plant name is required')
      .max(100, 'Plant name must be max 100 characters')
      .refine(val => !isWhitespaceOnly(val), 'Plant name cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    // Offer type - required
    offerType: z.enum(offerTypeValues, { message: 'Offer type is required' }),
    offer_type: z.enum(offerTypeValues).optional(),
    
    // Category fields - required
    category: z.enum(categoryValues, { message: 'Category is required' }),
    size: z.enum(sizeValues, { message: 'Size is required' }),
    condition: z.enum(conditionValues, { message: 'Condition is required' }),
    careLevel: z.enum(careLevelValues, { message: 'Care level is required' }),
    care_level: z.enum(careLevelValues).optional(),
    
    // Location - required with normalization
    city: z
      .string({ message: 'City is required' })
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'City cannot be only spaces')
      .refine(val => hasLetters(val), 'City name must contain at least one letter')
      .transform(normalizeCity),
    
    // Additional plant info
    genus: z
      .string()
      .trim()
      .min(1, 'Genus is required')
      .max(50, 'Genus must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'Genus cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    family: z
      .string()
      .trim()
      .min(1, 'Family is required')
      .max(50, 'Family must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'Family cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    commonName: z
      .string()
      .trim()
      .min(1, 'Common name is required')
      .max(100, 'Common name must be max 100 characters')
      .refine(val => !isWhitespaceOnly(val), 'Common name cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    // Plant detection API results
    plantResult: plantSourceSchema,
    
    primary: plantSourceSchema,
    
    plant: plantSourceSchema,
    
    photoResult: z.unknown().optional(),
    suggestion: z.unknown().optional(),
    result: z.unknown().optional(),
    
    // Description - with length and HTML sanitization
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description must be max 1000 characters')
      .refine(val => !isWhitespaceOnly(val), 'Description cannot be only spaces')
      .refine(val => hasMinWords(val, 2), 'Description must contain at least 2 words')
      .transform(sanitizeHtml)
      .refine(val => val.trim().length >= 10, 'Description must be at least 10 characters after sanitization (HTML removed)')
      .optional(),
    
    // Photos with URL validation
    photo: z.string().url('Invalid photo URL').min(1).optional(),
    photoUrl: z.string().url('Invalid photo URL').optional(),
    photoKey: z.string().regex(/^announcements\/[\w\-]+\/[\w\.\-]+$/, 'Invalid S3 key format').optional(),
    
    photos: z
      .array(z.string().url('Each photo must be a valid URL'))
      .max(5, 'Maximum 5 photos allowed')
      .optional(),
    
    coverPhoto: z.string().url('Cover photo must be a valid URL').optional(),
    imageUrl: z.string().url('Invalid image URL').optional(),
    
    images: z
      .array(z.string().url('Each image must be a valid URL'))
      .max(5, 'Maximum 5 images allowed')
      .optional(),
    
    photoBase64: z.string()
      .regex(/^data:image\/(png|jpe?g|gif);base64,[A-Za-z0-9+\/=]+$/, 'Invalid base64 image format')
      .max(5_242_880, 'Image too large (max 5MB)')
      .optional(),
    
    // Additional tags with validation
    additionalTags: z
      .array(z.string().min(1).max(30, 'Each tag max 30 characters').trim())
      .max(10, 'Maximum 10 tags allowed')
      .refine(arr => arr.length === 0 || arr.every(tag => tag.trim().length > 0), 'Tags cannot be empty')
      .optional(),
    
    additional_tags: z
      .array(z.string().min(1).max(30).trim())
      .max(10)
      .optional(),
    
    // Location details
    district: z
      .string()
      .trim()
      .min(1, 'District is required')
      .max(50, 'District must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'District cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    // Condition flags
    pestFree: z.boolean().optional(),
    pest_free: z.boolean().optional(),
    readyToExchange: z.boolean().optional(),
    ready_to_exchange: z.boolean().optional(),
    
    // Matching algorithm fields - required
    wateringFreq: z.enum(wateringFreqValues, { message: 'Watering frequency is required' }),
    lightReqs: z.enum(lightReqsValues, { message: 'Light requirements are required' }),
    
    // Optional matching fields
    humidity: z.enum(humidityValues).optional(),
    toxicity: z.enum(toxicityValues).optional(),
    growthRate: z.enum(growthRateValues).optional(),
    hasOffspring: z.boolean().optional(),
    
    // Status and lifecycle
    status: z.enum(statusValues).optional(),
    
    
    // Expiration - must be future date
    expiresAt: z
      .string()
      .datetime({ 
        message: 'Must be ISO 8601 format (e.g., 2026-06-30T23:59:59Z)' 
      })
      .refine(
        (date) => validateDateInRange(date),
        { message: 'Expiration date must be between today and 5 years from now' }
      )
      .nullable()
      .optional(),
  })
  .refine((data) => {
    // P0: Plant data required - either direct or from API
    const hasDirect = Boolean(data.plantName || data.commonName || data.genus || data.family);
    const resultSources = [data.plantResult, data.primary, data.plant, data.photoResult, data.suggestion, data.result];
    const hasResult = hasPlantResult(resultSources);
    return hasDirect || hasResult;
  }, {
    message: 'Plant identification required: provide plant name, common name, genus, family, or use plant detection API',
    path: ['plantName'],
  })
  .refine((data) => !hasOfferCaseConflicts(data as Record<string, unknown>), {
    message: 'offerType and offer_type, careLevel and care_level cannot have different values',
    path: ['offerType'],
  }),
});

export const updateAnnouncementSchema = z.object({
  body: z.object({
    plantName: z
      .string()
      .trim()
      .min(1, 'Plant name is required')
      .max(100, 'Plant name must be max 100 characters')
      .refine(val => !isWhitespaceOnly(val), 'Plant name cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    offerType: z.enum(offerTypeValues).optional(),
    offer_type: z.enum(offerTypeValues).optional(),
    category: z.enum(categoryValues).optional(),
    size: z.enum(sizeValues).optional(),
    condition: z.enum(conditionValues).optional(),
    
    careLevel: z.enum(careLevelValues).optional(),
    care_level: z.enum(careLevelValues).optional(),
    
    city: z
      .string()
      .trim()
      .min(2, 'City must be at least 2 characters')
      .max(50, 'City must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'City cannot be only spaces')
      .refine(val => hasLetters(val), 'City name must contain at least one letter')
      .transform(normalizeCity)
      .optional(),
    
    genus: z
      .string()
      .trim()
      .min(1, 'Genus is required')
      .max(50, 'Genus must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'Genus cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    family: z
      .string()
      .trim()
      .min(1, 'Family is required')
      .max(50, 'Family must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'Family cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    commonName: z
      .string()
      .trim()
      .min(1, 'Common name is required')
      .max(100, 'Common name must be max 100 characters')
      .refine(val => !isWhitespaceOnly(val), 'Common name cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    plantResult: z.unknown().optional(),
    primary: z.unknown().optional(),
    plant: z.unknown().optional(),
    photoResult: z.unknown().optional(),
    suggestion: z.unknown().optional(),
    result: z.unknown().optional(),
    
    description: z
      .string()
      .trim()
      .min(10, 'Description must be at least 10 characters')
      .max(1000, 'Description must be max 1000 characters')
      .refine(val => !isWhitespaceOnly(val), 'Description cannot be only spaces')
      .refine(val => hasMinWords(val, 2), 'Description must contain at least 2 words')
      .transform(sanitizeHtml)
      .refine(val => val.trim().length >= 10, 'Description must be at least 10 characters after sanitization (HTML removed)')
      .nullable()
      .optional(),
    
    photo: z.string().url('Invalid photo URL').nullable().optional(),
    photoUrl: z.string().url('Invalid photo URL').nullable().optional(),
    photoKey: z.string().regex(/^announcements\/[\w\-]+\/[\w\.\-]+$/, 'Invalid S3 key format').nullable().optional(),
    
    photos: z
      .array(z.string().url('Each photo must be a valid URL'))
      .max(5, 'Maximum 5 photos allowed')
      .optional(),
    
    coverPhoto: z.string().url('Cover photo must be a valid URL').nullable().optional(),
    imageUrl: z.string().url('Invalid image URL').nullable().optional(),
    
    images: z
      .array(z.string().url('Each image must be a valid URL'))
      .max(5, 'Maximum 5 images allowed')
      .optional(),
    
    photoBase64: z.string()
      .regex(/^data:image\/(png|jpe?g|gif);base64,[A-Za-z0-9+\/=]+$/, 'Invalid base64 image format')
      .max(5_242_880, 'Image too large (max 5MB)')
      .nullable()
      .optional(),
    
    additionalTags: z
      .array(z.string().min(1).max(30).trim())
      .max(10)
      .optional(),
    
    additional_tags: z
      .array(z.string().min(1).max(30).trim())
      .max(10)
      .optional(),
    
    district: z
      .string()
      .trim()
      .min(1, 'District is required')
      .max(50, 'District must be max 50 characters')
      .refine(val => !isWhitespaceOnly(val), 'District cannot be only spaces')
      .transform(sanitizeHtml)
      .optional(),
    
    pestFree: z.boolean().optional(),
    pest_free: z.boolean().optional(),
    readyToExchange: z.boolean().optional(),
    ready_to_exchange: z.boolean().optional(),
    
    wateringFreq: z.enum(wateringFreqValues).nullable().optional(),
    lightReqs: z.enum(lightReqsValues).nullable().optional(),
    humidity: z.enum(humidityValues).nullable().optional(),
    toxicity: z.enum(toxicityValues).nullable().optional(),
    growthRate: z.enum(growthRateValues).nullable().optional(),
    hasOffspring: z.boolean().optional(),
    
    status: z.enum(statusValues).optional(),
    
    
    expiresAt: z
      .string()
      .datetime({ 
        message: 'Must be ISO 8601 format (e.g., 2026-06-30T23:59:59Z)' 
      })
      .refine(
        (date) => validateDateInRange(date),
        { message: 'Expiration date must be between today and 5 years from now' }
      )
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
    path: ['body'],
  })
  .refine((data) => !hasOfferCaseConflicts(data as Record<string, unknown>), {
    message: 'offerType and offer_type, careLevel and care_level cannot have different values',
    path: ['offerType'],
  }),
});

export const searchAnnouncementSchema = z.object({
  query: z.object({
    query: z.string().trim().min(1).max(100).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    district: z.string().trim().min(1).max(80).optional(),
    offerType: z.enum(offerTypeValues).optional(),
    status: z.enum(statusValues).optional(),
    plantName: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'plantName']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});
