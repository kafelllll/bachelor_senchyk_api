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
const statusValues = ['active', 'pending', 'rejected', 'inactive'] as const;
const searchStatusValues = ['active', 'pending', 'rejected', 'inactive', 'in-progress', 'completed'] as const;
const isWhitespaceOnly = (str: string) => str.trim().length === 0;

const sanitizeHtml = (html: string) => {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');
};
const normalizeCity = (city: string) => {
  return city
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
const hasLetters = (str: string) => /\p{L}/u.test(str);

const hasMinWords = (str: string, minWords: number) => {
  const words = str.trim().split(/\s+/).filter(word => word.length > 0);
  return words.length >= minWords;
};
const hasDigits = (str: string) => /\d/.test(str);

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
        z.string().regex(/^\d+$/, 'ID має містити лише цифри'),
        z.number().int().gte(0, 'ID має бути невід’ємним'),
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
    plantName: z
      .string({ message: 'Назва рослини є обов’язковою' })
      .trim()
      .min(1, 'Назва рослини є обов’язковою')
      .max(100, 'Назва рослини має містити не більше 100 символів')
      .refine(val => !isWhitespaceOnly(val), 'Назва рослини не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    offerType: z.enum(offerTypeValues, { message: 'Тип пропозиції є обов’язковим' }),
    offer_type: z.enum(offerTypeValues).optional(),
    category: z.enum(categoryValues, { message: 'Категорія є обов’язковою' }),
    size: z.enum(sizeValues, { message: 'Розмір є обов’язковим' }),
    condition: z.enum(conditionValues, { message: 'Стан є обов’язковим' }),
    careLevel: z.enum(careLevelValues, { message: 'Рівень догляду є обов’язковим' }),
    care_level: z.enum(careLevelValues).optional(),
    city: z
      .string({ message: 'Місто є обов’язковим' })
      .trim()
      .min(2, 'Місто має містити щонайменше 2 символи')
      .max(50, 'Місто має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Місто не може складатися лише з пробілів')
      .refine(val => hasLetters(val), 'Назва міста має містити щонайменше одну літеру')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(normalizeCity),
    genus: z
      .string()
      .trim()
      .min(1, 'Рід є обов’язковим')
      .max(50, 'Рід має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Рід не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    
    family: z
      .string()
      .trim()
      .min(1, 'Родина є обов’язковою')
      .max(50, 'Родина має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Родина не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    
    commonName: z
      .string()
      .trim()
      .min(1, 'Загальна назва є обов’язковою')
      .max(100, 'Загальна назва має містити не більше 100 символів')
      .refine(val => !isWhitespaceOnly(val), 'Загальна назва не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    plantResult: plantSourceSchema,
    
    primary: plantSourceSchema,
    
    plant: plantSourceSchema,
    
    photoResult: z.unknown().optional(),
    suggestion: z.unknown().optional(),
    result: z.unknown().optional(),
    description: z
      .string()
      .trim()
      .min(10, 'Опис має містити щонайменше 10 символів')
      .max(1000, 'Опис має містити не більше 1000 символів')
      .refine(val => !isWhitespaceOnly(val), 'Опис не може складатися лише з пробілів')
      .refine(val => hasMinWords(val, 2), 'Опис має містити щонайменше 2 слова')
      .transform(sanitizeHtml)
      .refine(val => val.trim().length >= 10, 'Опис має містити щонайменше 10 символів після очищення (HTML видалено)')
      .optional(),
    photo: z.string().url('Некоректний URL фото').min(1).optional(),
    photoUrl: z.string().url('Некоректний URL фото').optional(),
    photoKey: z.string().regex(/^announcements\/[\w\-]+\/[\w\.\-]+$/, 'Некоректний формат ключа S3').optional(),
    
    photos: z
      .array(z.string().url('Кожне фото має бути коректним URL'))
      .max(5, 'Дозволено не більше 5 фото')
      .optional(),
    
    coverPhoto: z.string().url('Обкладинка має бути коректним URL').optional(),
    imageUrl: z.string().url('Некоректний URL зображення').optional(),
    
    images: z
      .array(z.string().url('Кожне зображення має бути коректним URL'))
      .max(5, 'Дозволено не більше 5 зображень')
      .optional(),
    
    photoBase64: z.string()
      .regex(/^data:image\/(png|jpe?g|gif);base64,[A-Za-z0-9+\/=]+$/, 'Некоректний формат base64-зображення')
      .max(5_242_880, 'Зображення завелике (максимум 5 МБ)')
      .optional(),
    additionalTags: z
      .array(z.string().min(1).max(30, 'Кожен тег має містити не більше 30 символів').trim())
      .max(10, 'Дозволено не більше 10 тегів')
      .refine(arr => arr.length === 0 || arr.every(tag => tag.trim().length > 0), 'Теги не можуть бути порожніми')
      .optional(),
    
    additional_tags: z
      .array(z.string().min(1).max(30).trim())
      .max(10)
      .optional(),
    district: z
      .string()
      .trim()
      .min(1, 'Район є обов’язковим')
      .max(50, 'Район має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Район не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    pestFree: z.boolean().optional(),
    pest_free: z.boolean().optional(),
    readyToExchange: z.boolean().optional(),
    ready_to_exchange: z.boolean().optional(),
    wateringFreq: z.enum(wateringFreqValues, { message: 'Частота поливу є обов’язковою' }),
    lightReqs: z.enum(lightReqsValues, { message: 'Освітлення є обов’язковим' }),
    humidity: z.enum(humidityValues).optional(),
    toxicity: z.enum(toxicityValues).optional(),
    growthRate: z.enum(growthRateValues).optional(),
    hasOffspring: z.boolean().optional(),
    status: z.enum(statusValues).optional(),
    expiresAt: z
      .string()
      .datetime({ 
        message: 'Дата має бути у форматі ISO 8601 (наприклад, 2026-06-30T23:59:59Z)' 
      })
      .refine(
        (date) => validateDateInRange(date),
        { message: 'Дата завершення має бути між сьогодні та наступними 5 роками' }
      )
      .nullable()
      .optional(),
  })
  .refine((data) => {
    const hasDirect = Boolean(data.plantName || data.commonName || data.genus || data.family);
    const resultSources = [data.plantResult, data.primary, data.plant, data.photoResult, data.suggestion, data.result];
    const hasResult = hasPlantResult(resultSources);
    return hasDirect || hasResult;
  }, {
    message: 'Потрібна ідентифікація рослини: вкажіть назву рослини, загальну назву, рід, родину або використайте API розпізнавання рослин',
    path: ['plantName'],
  })
  .refine((data) => !hasOfferCaseConflicts(data as Record<string, unknown>), {
    message: 'offerType і offer_type, careLevel і care_level не можуть мати різні значення',
    path: ['offerType'],
  }),
});

export const updateAnnouncementSchema = z.object({
  body: z.object({
    plantName: z
      .string()
      .trim()
      .min(1, 'Назва рослини є обов’язковою')
      .max(100, 'Назва рослини має містити не більше 100 символів')
      .refine(val => !isWhitespaceOnly(val), 'Назва рослини не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
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
      .min(2, 'Місто має містити щонайменше 2 символи')
      .max(50, 'Місто має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Місто не може складатися лише з пробілів')
      .refine(val => hasLetters(val), 'Назва міста має містити щонайменше одну літеру')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(normalizeCity)
      .optional(),
    
    genus: z
      .string()
      .trim()
      .min(1, 'Рід є обов’язковим')
      .max(50, 'Рід має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Рід не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    
    family: z
      .string()
      .trim()
      .min(1, 'Родина є обов’язковою')
      .max(50, 'Родина має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Родина не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
      .transform(sanitizeHtml)
      .optional(),
    
    commonName: z
      .string()
      .trim()
      .min(1, 'Загальна назва є обов’язковою')
      .max(100, 'Загальна назва має містити не більше 100 символів')
      .refine(val => !isWhitespaceOnly(val), 'Загальна назва не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
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
      .min(10, 'Опис має містити щонайменше 10 символів')
      .max(1000, 'Опис має містити не більше 1000 символів')
      .refine(val => !isWhitespaceOnly(val), 'Опис не може складатися лише з пробілів')
      .refine(val => hasMinWords(val, 2), 'Опис має містити щонайменше 2 слова')
      .transform(sanitizeHtml)
      .refine(val => val.trim().length >= 10, 'Опис має містити щонайменше 10 символів після очищення (HTML видалено)')
      .nullable()
      .optional(),
    
    photo: z.string().url('Некоректний URL фото').nullable().optional(),
    photoUrl: z.string().url('Некоректний URL фото').nullable().optional(),
    photoKey: z.string().regex(/^announcements\/[\w\-]+\/[\w\.\-]+$/, 'Некоректний формат ключа S3').nullable().optional(),
    
    photos: z
      .array(z.string().url('Кожне фото має бути коректним URL'))
      .max(5, 'Дозволено не більше 5 фото')
      .optional(),
    
    coverPhoto: z.string().url('Обкладинка має бути коректним URL').nullable().optional(),
    imageUrl: z.string().url('Некоректний URL зображення').nullable().optional(),
    
    images: z
      .array(z.string().url('Кожне зображення має бути коректним URL'))
      .max(5, 'Дозволено не більше 5 зображень')
      .optional(),
    
    photoBase64: z.string()
      .regex(/^data:image\/(png|jpe?g|gif);base64,[A-Za-z0-9+\/=]+$/, 'Некоректний формат base64-зображення')
      .max(5_242_880, 'Зображення завелике (максимум 5 МБ)')
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
      .min(1, 'Район є обов’язковим')
      .max(50, 'Район має містити не більше 50 символів')
      .refine(val => !isWhitespaceOnly(val), 'Район не може складатися лише з пробілів')
      .refine(val => !hasDigits(val), 'Значення не може містити цифри')
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
        message: 'Дата має бути у форматі ISO 8601 (наприклад, 2026-06-30T23:59:59Z)' 
      })
      .refine(
        (date) => validateDateInRange(date),
        { message: 'Дата завершення має бути між сьогодні та наступними 5 роками' }
      )
      .nullable()
      .optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Потрібно передати щонайменше одне поле',
    path: ['body'],
  })
  .refine((data) => !hasOfferCaseConflicts(data as Record<string, unknown>), {
    message: 'offerType і offer_type, careLevel і care_level не можуть мати різні значення',
    path: ['offerType'],
  }),
});

export const searchAnnouncementSchema = z.object({
  query: z.object({
    query: z.string().trim().min(1).max(100).optional(),
    category: z.enum(categoryValues).optional(),
    size: z.enum(sizeValues).optional(),
    condition: z.enum(conditionValues).optional(),
    careLevel: z.enum(careLevelValues).optional(),
    city: z.string().trim().min(1).max(80).optional(),
    district: z.string().trim().min(1).max(80).optional(),
    offerType: z.enum(offerTypeValues).optional(),
    status: z.enum(searchStatusValues).optional(),
    plantName: z.string().trim().min(1).max(100).optional(),
    userId: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(10_000).optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'plantName']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

