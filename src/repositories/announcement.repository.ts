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
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const findAnnouncementsByUser = async (userId: string) => {
  return prisma.announcement.findMany({
    where: { userId },
    orderBy: {
      createdAt: 'desc',
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
