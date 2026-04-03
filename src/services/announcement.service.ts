import type { Prisma } from '@prisma/client';
import * as announcementRepository from '../repositories/announcement.repository.js';
import type { CreateAnnouncementInput, UpdateAnnouncementInput } from '../types/announcement.types.js';

const hasPlantFields = (value: unknown): value is Record<string, unknown> => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Boolean(
    record.name ||
    record.common_name ||
    record.commonName ||
    record.scientific_name ||
    record.scientificName ||
    record.genus ||
    record.family,
  );
};

const findPlantData = (value: unknown, maxDepth = 4): Record<string, unknown> | null => {
  const queue: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];
  const seen = new Set<unknown>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    const { node, depth } = current;
    if (!node || typeof node !== 'object') {
      continue;
    }
    if (seen.has(node)) {
      continue;
    }
    seen.add(node);

    if (hasPlantFields(node)) {
      return node;
    }

    if (depth >= maxDepth) {
      continue;
    }

    if (Array.isArray(node)) {
      node.forEach((item) => queue.push({ node: item, depth: depth + 1 }));
      continue;
    }

    Object.values(node as Record<string, unknown>).forEach((item) => {
      queue.push({ node: item, depth: depth + 1 });
    });
  }

  return null;
};

const buildPhotoUrl = (photoKey: string | null | undefined) => {
  if (!photoKey) {
    return null;
  }
  const baseUrl = process.env.AWS_S3_PUBLIC_BASE_URL;
  if (!baseUrl) {
    return photoKey;
  }
  return `${baseUrl.replace(/\/$/, '')}/${photoKey.replace(/^\//, '')}`;
};

const resolvePhoto = (data: {
  photo?: string | null;
  photoUrl?: string | null;
  photoKey?: string | null;
  photoBase64?: string | null;
}) => {
  if (data.photoBase64) {
    return data.photoBase64;
  }
  if (data.photo) {
    return data.photo;
  }
  if (data.photoUrl) {
    return data.photoUrl;
  }
  if (data.photoKey) {
    return buildPhotoUrl(data.photoKey);
  }
  return null;
};

const normalizePhotos = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [] as string[];
  }
  const cleaned = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
  return cleaned.slice(0, 5);
};

const normalizeString = (str: string | undefined | null): string | null => {
  if (!str) return null;
  return str.trim().replace(/\s+/g, ' ');
};

const sanitizeHtml = (html: string | undefined | null): string | null => {
  if (!html) return null;
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/javascript:/gi, '');
};

const normalizeCity = (city: string | undefined | null): string | null => {
  if (!city) return null;
  return city
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const normalizeNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }
  return normalizeString(value);
};

const normalizeOfferTypeForCreate = (value?: string) => {
  const lower = value?.toLowerCase();
  if (!lower) {
    return 'offer';
  }
  if (lower === 'give' || lower === 'giveaway') {
    return 'offer';
  }
  if (lower === 'seek' || lower === 'looking' || lower === 'request' || lower === 'looking_for' || lower === 'looking-for') {
    return 'looking-for';
  }
  return lower === 'offer' || lower === 'looking-for' ? lower : 'offer';
};

const normalizeOfferTypeForUpdate = (value?: string) => {
  const lower = value?.toLowerCase();
  if (!lower) {
    return undefined;
  }
  if (lower === 'give' || lower === 'giveaway') {
    return 'offer';
  }
  if (lower === 'seek' || lower === 'looking' || lower === 'request' || lower === 'looking_for' || lower === 'looking-for') {
    return 'looking-for';
  }
  return lower === 'offer' || lower === 'looking-for' ? lower : undefined;
};

const normalizeRequiredString = (value: string | null | undefined, fallback: string) => {
  const normalized = normalizeString(value ?? null);
  return normalized ?? fallback;
};

const normalizeAnnouncementInput = (data: any) => {
  const normalized = { ...data };
  if (normalized.offerType === undefined && normalized.offer_type !== undefined) {
    normalized.offerType = normalized.offer_type;
  }
  if (normalized.careLevel === undefined && normalized.care_level !== undefined) {
    normalized.careLevel = normalized.care_level;
  }
  if (normalized.additionalTags === undefined && normalized.additional_tags !== undefined) {
    normalized.additionalTags = normalized.additional_tags;
  }
  if (normalized.pestFree === undefined && normalized.pest_free !== undefined) {
    normalized.pestFree = normalized.pest_free;
  }
  if (normalized.readyToExchange === undefined && normalized.ready_to_exchange !== undefined) {
    normalized.readyToExchange = normalized.ready_to_exchange;
  }
  if (normalized.photoUrl === undefined && normalized.imageUrl !== undefined) {
    normalized.photoUrl = normalized.imageUrl;
  }
  if (normalized.photos === undefined && normalized.images !== undefined) {
    normalized.photos = normalized.images;
  }
  return normalized;
};

export const createAnnouncement = async (userId: string, data: CreateAnnouncementInput) => {
  const normalizedData = normalizeAnnouncementInput(data as any);
  const plantResult =
    findPlantData(normalizedData.plantResult) ??
    findPlantData(normalizedData.primary) ??
    findPlantData(normalizedData.plant) ??
    findPlantData((data as any).photoResult) ??
    findPlantData((data as any).suggestion) ??
    findPlantData((data as any).result) ??
    {};
  const plantName =
    normalizedData.plantName ??
    plantResult.scientific_name ??
    plantResult.scientificName ??
    plantResult.name ??
    plantResult.common_name ??
    plantResult.commonName ??
    'Unknown';
  const commonName =
    normalizedData.commonName ??
    plantResult.common_name ??
    plantResult.commonName ??
    plantResult.name ??
    plantResult.scientific_name ??
    plantResult.scientificName ??
    'Unknown';
  const genus = normalizedData.genus ?? plantResult.genus ?? 'Unknown';
  const family = normalizedData.family ?? plantResult.family ?? 'Unknown';
  const legacyPhoto = resolvePhoto(normalizedData);
  const photosInput = normalizePhotos((normalizedData as any).photos);
  let coverPhoto = (normalizedData as any).coverPhoto ?? legacyPhoto ?? null;
  let photos = photosInput.length > 0 ? photosInput : coverPhoto ? [coverPhoto] : [];
  if (coverPhoto && !photos.includes(coverPhoto)) {
    photos = [coverPhoto, ...photos].slice(0, 5);
  }

  const payload: any = {
    user: { connect: { id: userId } },
    plantName: normalizeRequiredString(plantName, 'Unknown'),
    offerType: normalizeOfferTypeForCreate(normalizedData.offerType),
    category: normalizedData.category,
    size: normalizedData.size,
    condition: normalizedData.condition,
    careLevel: normalizedData.careLevel,
    city: normalizeRequiredString(normalizeCity(normalizedData.city), 'Unknown'),
    genus: normalizeRequiredString(genus, 'Unknown'),
    family: normalizeRequiredString(family, 'Unknown'),
    commonName: normalizeRequiredString(commonName, 'Unknown'),
    description: sanitizeHtml(normalizedData.description),
    photos,
    coverPhoto,
    additionalTags: (normalizedData.additionalTags || []).map((tag: string) => normalizeString(tag) || '').filter(Boolean),
    district: normalizeString(normalizedData.district),
    pestFree: normalizedData.pestFree ?? null,
    readyToExchange: normalizedData.readyToExchange ?? null,
    wateringFreq: normalizedData.wateringFreq ?? null,
    lightReqs: normalizedData.lightReqs ?? null,
    humidity: normalizedData.humidity ?? null,
    toxicity: normalizedData.toxicity ?? null,
    growthRate: normalizedData.growthRate ?? null,
    hasOffspring: normalizedData.hasOffspring ?? false,
    status: normalizedData.status ?? 'active',
    expiresAt: normalizedData.expiresAt ? new Date(normalizedData.expiresAt) : null,
  };

  return announcementRepository.createAnnouncement(payload);
};

export const getAnnouncementsForFeed = async (userId: string) => {
  return announcementRepository.findAnnouncementsExcludingUser(userId);
};

export const getAnnouncementsForUser = async (userId: string) => {
  return announcementRepository.findAnnouncementsByUser(userId);
};

export const getAnnouncementById = async (userId: string, announcementId: string) => {
  return announcementRepository.findAnnouncementById(announcementId, userId);
};

/**
 * Отримує оглошення за ID без перевірки користувача (публічний доступ)
 */
export const getAnnouncementByIdPublic = async (announcementId: string) => {
  return announcementRepository.findAnnouncementByIdPublic(announcementId);
};

export const deleteAnnouncement = async (userId: string, announcementId: string) => {
  const result = await announcementRepository.deleteAnnouncementById(announcementId, userId);
  return result.count > 0;
};

export const updateAnnouncement = async (userId: string, announcementId: string, data: UpdateAnnouncementInput) => {
  const normalizedData = normalizeAnnouncementInput(data as any);
  const plantResult =
    findPlantData(normalizedData.plantResult) ??
    findPlantData(normalizedData.primary) ??
    findPlantData(normalizedData.plant) ??
    findPlantData((data as any).photoResult) ??
    findPlantData((data as any).suggestion) ??
    findPlantData((data as any).result) ??
    null;

  const normalizedOfferType = normalizeOfferTypeForUpdate(normalizedData.offerType);
  const normalizedPlantName = normalizeString(normalizedData.plantName ?? null);
  const normalizedGenus = normalizeString(normalizedData.genus ?? null);
  const normalizedFamily = normalizeString(normalizedData.family ?? null);
  const normalizedCommonName = normalizeString(normalizedData.commonName ?? null);
  const normalizedCity = normalizeCity(normalizedData.city ?? null);

  const updatePayload: Prisma.AnnouncementUpdateInput = {
    ...(normalizedPlantName ? { plantName: normalizedPlantName } : {}),
    ...(normalizedOfferType ? { offerType: normalizedOfferType } : {}),
    ...(normalizedData.category ? { category: normalizedData.category } : {}),
    ...(normalizedData.size ? { size: normalizedData.size } : {}),
    ...(normalizedData.condition ? { condition: normalizedData.condition } : {}),
    ...(normalizedData.careLevel ? { careLevel: normalizedData.careLevel } : {}),
    ...(normalizedCity ? { city: normalizedCity } : {}),
    ...(normalizedGenus ? { genus: normalizedGenus } : {}),
    ...(normalizedFamily ? { family: normalizedFamily } : {}),
    ...(normalizedCommonName ? { commonName: normalizedCommonName } : {}),
    ...(normalizedData.description !== undefined ? { description: sanitizeHtml(normalizedData.description) } : {}),
    ...(normalizedData.additionalTags ? { additionalTags: normalizedData.additionalTags.map((tag: string) => normalizeString(tag) || '').filter(Boolean) } : {}),
    ...(normalizedData.district !== undefined ? { district: normalizeString(normalizedData.district) } : {}),
    ...(normalizedData.pestFree !== undefined ? { pestFree: normalizedData.pestFree } : {}),
    ...(normalizedData.readyToExchange !== undefined ? { readyToExchange: normalizedData.readyToExchange } : {}),
    ...(normalizedData.wateringFreq !== undefined ? { wateringFreq: normalizedData.wateringFreq ?? null } : {}),
    ...(normalizedData.lightReqs !== undefined ? { lightReqs: normalizedData.lightReqs ?? null } : {}),
    ...(normalizedData.humidity !== undefined ? { humidity: normalizedData.humidity ?? null } : {}),
    ...(normalizedData.toxicity !== undefined ? { toxicity: normalizedData.toxicity ?? null } : {}),
    ...(normalizedData.growthRate !== undefined ? { growthRate: normalizedData.growthRate ?? null } : {}),
    ...(normalizedData.hasOffspring !== undefined ? { hasOffspring: normalizedData.hasOffspring } : {}),
    ...(normalizedData.status !== undefined ? { status: normalizedData.status ?? 'active' } : {}),
    ...(normalizedData.expiresAt !== undefined ? { expiresAt: normalizedData.expiresAt ? new Date(normalizedData.expiresAt) : null } : {}),
  };

  const hasPhotosArray = 'photos' in normalizedData || 'images' in normalizedData;
  const hasCoverPhoto = 'coverPhoto' in normalizedData || 'imageUrl' in normalizedData;
  const hasLegacyPhoto = 'photoBase64' in normalizedData || 'photo' in normalizedData || 'photoUrl' in normalizedData || 'photoKey' in normalizedData;

  if (hasPhotosArray || hasCoverPhoto || hasLegacyPhoto) {
    const nextPhotos = hasPhotosArray ? normalizePhotos((normalizedData as any).photos) : null;
    const resolvedLegacy = resolvePhoto(normalizedData);
    let nextCover: string | null = null;

    if (hasCoverPhoto) {
      nextCover = (normalizedData as any).coverPhoto ?? null;
    } else if (hasLegacyPhoto) {
      nextCover = resolvedLegacy;
    }

    if (hasPhotosArray && !nextCover && nextPhotos && nextPhotos.length > 0) {
      nextCover = nextPhotos[0] ?? null;
    }

    if (hasPhotosArray && nextPhotos) {
      let normalized = nextPhotos;
      if (nextCover && !normalized.includes(nextCover)) {
        normalized = [nextCover, ...normalized].slice(0, 5);
      }
      updatePayload.photos = normalized;
    }

    if (hasCoverPhoto && (normalizedData as any).coverPhoto === null) {
      updatePayload.coverPhoto = null;
    } else if (nextCover) {
      updatePayload.coverPhoto = nextCover;
    }
  }

  if (plantResult) {
    if (!updatePayload.plantName) {
      const nextPlantName =
        plantResult.scientific_name ??
        plantResult.scientificName ??
        plantResult.name ??
        plantResult.common_name ??
        plantResult.commonName ??
        null;
      const normalizedName = normalizeNonEmptyString(nextPlantName);
      if (normalizedName) {
        updatePayload.plantName = normalizedName;
      }
    }
    if (!updatePayload.commonName) {
      const nextCommonName =
        plantResult.common_name ??
        plantResult.commonName ??
        plantResult.name ??
        plantResult.scientific_name ??
        plantResult.scientificName ??
        null;
      const normalizedName = normalizeNonEmptyString(nextCommonName);
      if (normalizedName) {
        updatePayload.commonName = normalizedName;
      }
    }
    if (!updatePayload.genus) {
      const nextGenus = plantResult.genus ?? null;
      const normalizedName = normalizeNonEmptyString(nextGenus);
      if (normalizedName) {
        updatePayload.genus = normalizedName;
      }
    }
    if (!updatePayload.family) {
      const nextFamily = plantResult.family ?? null;
      const normalizedName = normalizeNonEmptyString(nextFamily);
      if (normalizedName) {
        updatePayload.family = normalizedName;
      }
    }
  }

  const result = await announcementRepository.updateAnnouncementById(announcementId, userId, updatePayload);
  return result.count > 0;
};

/**
 * Підраховує кількість активних оглошень користувача
 */
export const countActiveAnnouncements = async (userId: string) => {
  return announcementRepository.countActiveAnnouncements(userId);
};
