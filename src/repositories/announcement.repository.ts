import prisma from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const createAnnouncement = async (data: Prisma.AnnouncementCreateInput) => {
  return prisma.announcement.create({ data });
};
