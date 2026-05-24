import prisma from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

const announcementSelect = {
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
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
} as const;

const matchingCandidateSelect = {
  id: true,
  plantName: true,
  offerType: true,
  category: true,
  size: true,
  condition: true,
  careLevel: true,
  city: true,
  district: true,
  additionalTags: true,
  pestFree: true,
  readyToExchange: true,
  genus: true,
  family: true,
  commonName: true,
  wateringFreq: true,
  lightReqs: true,
  humidity: true,
  toxicity: true,
  growthRate: true,
  hasOffspring: true,
  photos: true,
  coverPhoto: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  user: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
} as const;

const matchingBaseSelect = {
  id: true,
  plantName: true,
  offerType: true,
  category: true,
  size: true,
  condition: true,
  careLevel: true,
  city: true,
  district: true,
  additionalTags: true,
  pestFree: true,
  readyToExchange: true,
  genus: true,
  family: true,
  commonName: true,
  wateringFreq: true,
  lightReqs: true,
  humidity: true,
  toxicity: true,
  growthRate: true,
  hasOffspring: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
} as const;

export const createAnnouncement = async (data: Prisma.AnnouncementCreateInput) => {
  return prisma.announcement.create({ data });
};

export const findAnnouncementsExcludingUser = async (userId: string) => {
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      userId: { not: userId },
      status: 'active',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: announcementSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const findActiveAnnouncements = async () => {
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      status: 'active',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: announcementSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const findAnnouncementsByUser = async (userId: string) => {
  return prisma.announcement.findMany({
    where: { userId },
    select: announcementSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

export const findActiveAnnouncementsByUserForMatching = async (userId: string) => {
  const now = new Date();
  return prisma.announcement.findMany({
    where: {
      userId,
      status: 'active',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: matchingBaseSelect,
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

export const findAnnouncementByIdPublic = async (id: string) => {
  return prisma.announcement.findUnique({
    where: { id },
    select: announcementSelect,
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

export const updateAnnouncementStatusById = async (id: string, status: string) => {
  return prisma.announcement.updateMany({
    where: { id },
    data: { status },
  });
};

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

export const countAnnouncementsByUser = async (userId: string) => {
  return prisma.announcement.count({
    where: {
      userId,
    },
  });
};

export const findMatchingCandidates = async (params: {
  userId: string;
  category: string;
  offerType: string | string[];
}) => {
  const now = new Date();
  const offerTypeFilter = Array.isArray(params.offerType)
    ? { in: params.offerType }
    : params.offerType;
  return prisma.announcement.findMany({
    where: {
      userId: { not: params.userId },
      category: params.category,
      offerType: offerTypeFilter,
      status: 'active',
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: matchingCandidateSelect,
    orderBy: {
      createdAt: 'desc',
    },
  });
};

const buildSearchWhere = (params: {
  query?: string;
  category?: string;
  size?: string;
  condition?: string;
  careLevel?: string;
  city?: string;
  district?: string;
  offerType?: string;
  status?: string;
  plantName?: string;
  userId?: string;
}) => {
  const andFilters: any[] = [];

  if (params.query) {
    const queryFilter = params.query;
    andFilters.push({
      OR: [
        { plantName: { contains: queryFilter, mode: 'insensitive' } },
        { commonName: { contains: queryFilter, mode: 'insensitive' } },
        { genus: { contains: queryFilter, mode: 'insensitive' } },
        { family: { contains: queryFilter, mode: 'insensitive' } },
        { description: { contains: queryFilter, mode: 'insensitive' } },
      ],
    });
  }

  if (params.plantName) {
    andFilters.push({ plantName: { contains: params.plantName, mode: 'insensitive' } });
  }

  if (params.userId) {
    andFilters.push({ userId: params.userId });
  }

  if (params.category) {
    andFilters.push({ category: params.category });
  }

  if (params.size) {
    andFilters.push({ size: params.size });
  }

  if (params.condition) {
    andFilters.push({ condition: params.condition });
  }

  if (params.careLevel) {
    andFilters.push({ careLevel: params.careLevel });
  }

  if (params.city) {
    andFilters.push({ city: { contains: params.city, mode: 'insensitive' } });
  }

  if (params.district) {
    andFilters.push({ district: { contains: params.district, mode: 'insensitive' } });
  }

  if (params.offerType) {
    andFilters.push({ offerType: params.offerType });
  }

  if (params.status) {
    andFilters.push({ status: params.status });
  }

  if (andFilters.length === 0) {
    return {};
  }

  return { AND: andFilters };
};

export const searchAnnouncements = async (params: {
  query?: string;
  category?: string;
  size?: string;
  condition?: string;
  careLevel?: string;
  city?: string;
  district?: string;
  offerType?: string;
  status?: string;
  plantName?: string;
  userId?: string;
  limit: number;
  page: number;
  sortBy: 'createdAt' | 'updatedAt' | 'plantName';
  sortOrder: 'asc' | 'desc';
}) => {
  const where = buildSearchWhere(params);
  const skip = (params.page - 1) * params.limit;

  return prisma.announcement.findMany({
    where,
    select: announcementSelect,
    orderBy: { [params.sortBy]: params.sortOrder },
    skip,
    take: params.limit,
  });
};

export const countSearchAnnouncements = async (params: {
  query?: string;
  category?: string;
  size?: string;
  condition?: string;
  careLevel?: string;
  city?: string;
  district?: string;
  offerType?: string;
  status?: string;
  plantName?: string;
  userId?: string;
}) => {
  const where = buildSearchWhere(params);
  return prisma.announcement.count({ where });
};
