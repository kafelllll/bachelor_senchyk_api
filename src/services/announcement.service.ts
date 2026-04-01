import type { Prisma } from '@prisma/client';
import * as announcementRepository from '../repositories/announcement.repository.js';
import type { CreateAnnouncementInput } from '../types/announcement.types.js';

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

export const createAnnouncement = async (userId: string, data: CreateAnnouncementInput) => {
  const plantResult =
    findPlantData(data.plantResult) ??
    findPlantData(data.primary) ??
    findPlantData(data.plant) ??
    findPlantData((data as any).photoResult) ??
    findPlantData((data as any).suggestion) ??
    findPlantData((data as any).result) ??
    {};
  const plantName =
    data.plantName ??
    plantResult.scientific_name ??
    plantResult.scientificName ??
    plantResult.name ??
    plantResult.common_name ??
    plantResult.commonName ??
    'Unknown';
  const commonName =
    data.commonName ??
    plantResult.common_name ??
    plantResult.commonName ??
    plantResult.name ??
    plantResult.scientific_name ??
    plantResult.scientificName ??
    'Unknown';
  const genus = data.genus ?? plantResult.genus ?? 'Unknown';
  const family = data.family ?? plantResult.family ?? 'Unknown';
  const photo = data.photoBase64 ?? data.photo ?? null;

  const payload: any = {
    user: { connect: { id: userId } },
    plantName,
    offerType: data.offerType,
    category: data.category,
    size: data.size,
    condition: data.condition,
    careLevel: data.careLevel,
    city: data.city,
    genus,
    family,
    commonName,
    description: data.description ?? null,
    photo,
    additionalTags: data.additionalTags ?? [],
    district: data.district ?? null,
    pestFree: data.pestFree ?? null,
    readyToExchange: data.readyToExchange ?? null,
  };

  return announcementRepository.createAnnouncement(payload);
};

export const getAnnouncementsForFeed = async (userId: string) => {
  return announcementRepository.findAnnouncementsExcludingUser(userId);
};

export const getAnnouncementsForUser = async (userId: string) => {
  return announcementRepository.findAnnouncementsByUser(userId);
};

export const deleteAnnouncement = async (userId: string, announcementId: string) => {
  const result = await announcementRepository.deleteAnnouncementById(announcementId, userId);
  return result.count > 0;
};
