import prisma from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const createAnnouncement = async (data: Prisma.AnnouncementCreateInput) => {
  return prisma.announcement.create({ data });
};

export const findAnnouncementsExcludingUser = async (userId: string) => {
  return prisma.announcement.findMany({
    where: {
      userId: { not: userId },
    },
    select: {
      id: true,
      plantName: true,
      offerType: true,
      category: true,
      size: true,
      condition: true,
      careLevel: true,
      city: true,
      district: true,
      description: true,
      additionalTags: true,
      pestFree: true,
      readyToExchange: true,
      genus: true,
      family: true,
      commonName: true,
      photos: true,
      coverPhoto: true,
      wateringFreq: true,
      lightReqs: true,
      humidity: true,
      toxicity: true,
      growthRate: true,
      hasOffspring: true,
      status: true,
      preferredExchangeItems: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      // Не включаємо: user (інформація про користувача) - приватно
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const findAnnouncementsByUser = async (userId: string) => {
  return prisma.announcement.findMany({
    where: { userId },
    select: {
      id: true,
      plantName: true,
      offerType: true,
      category: true,
      size: true,
      condition: true,
      careLevel: true,
      city: true,
      district: true,
      description: true,
      additionalTags: true,
      pestFree: true,
      readyToExchange: true,
      genus: true,
      family: true,
      commonName: true,
      photos: true,
      coverPhoto: true,
      wateringFreq: true,
      lightReqs: true,
      humidity: true,
      toxicity: true,
      growthRate: true,
      hasOffspring: true,
      status: true,
      preferredExchangeItems: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const findAnnouncementById = async (id: string, userId: string) => {
  return prisma.announcement.findFirst({
    where: {
      id,
      userId,
    },
  });
};

/**
 * Отримує оглошення за ID без перевірки користувача (публічний доступ)
 * Використовується для GET /announcements/:id де будь-хто може видіти будь-яке оглошення
 */
export const findAnnouncementByIdPublic = async (id: string) => {
  return prisma.announcement.findUnique({
    where: { id },
    select: {
      id: true,
      plantName: true,
      offerType: true,
      category: true,
      size: true,
      condition: true,
      careLevel: true,
      city: true,
      district: true,
      description: true,
      additionalTags: true,
      pestFree: true,
      readyToExchange: true,
      genus: true,
      family: true,
      commonName: true,
      photos: true,
      coverPhoto: true,
      wateringFreq: true,
      lightReqs: true,
      humidity: true,
      toxicity: true,
      growthRate: true,
      hasOffspring: true,
      status: true,
      preferredExchangeItems: true,
      expiresAt: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      // НЕ включаємо user (приватні дані користувача)
    },
  });
};

export const deleteAnnouncementById = async (id: string, userId: string) => {
  return prisma.announcement.deleteMany({
    where: {
      id,
      userId,
    },
  });
};

export const updateAnnouncementById = async (id: string, userId: string, data: Prisma.AnnouncementUpdateInput) => {
  return prisma.announcement.updateMany({
    where: {
      id,
      userId,
    },
    data,
  });
};

/**
 * Підраховує кількість активних оглошень користувача
 * Активні = статус 'active' та не закінчилося (expiresAt > now або expiresAt null)
 */
export const countActiveAnnouncements = async (userId: string) => {
  return prisma.announcement.count({
    where: {
      userId,
      status: 'active',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  });
};
