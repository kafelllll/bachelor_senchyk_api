import type { Prisma } from '@prisma/client';
import * as announcementRepository from '../repositories/announcement.repository.js';
import type { CreateAnnouncementInput } from '../types/announcement.types.js';

export const createAnnouncement = async (userId: string, data: CreateAnnouncementInput) => {
  const payload: any = {
    user: { connect: { id: userId } },
    plantName: data.plantName,
    category: data.category,
    size: data.size,
    condition: data.condition,
    careLevel: data.careLevel,
    city: data.city,
    genus: data.genus,
    family: data.family,
    commonName: data.commonName,
    description: data.description ?? null,
    additionalTags: data.additionalTags ?? [],
    district: data.district ?? null,
    pestFree: data.pestFree ?? null,
    readyToExchange: data.readyToExchange ?? null,
  };

  return announcementRepository.createAnnouncement(payload);
};
