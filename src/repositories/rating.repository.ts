import prisma from '../config/prisma.js';

const ratingSelect = {
  id: true,
  exchangeId: true,
  fromUserId: true,
  toUserId: true,
  score: true,
  comment: true,
  createdAt: true,
  fromUser: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
} as const;

export const createRating = async (data: {
  exchange: { connect: { id: string } };
  fromUser: { connect: { id: string } };
  toUser: { connect: { id: string } };
  score: number;
  comment?: string | null;
}) => {
  return prisma.rating.create({ data, select: ratingSelect });
};

export const findRatingByExchangeAndUser = async (exchangeId: string, fromUserId: string) => {
  return prisma.rating.findUnique({
    where: {
      exchangeId_fromUserId: {
        exchangeId,
        fromUserId,
      },
    },
  });
};

export const getRatingSummary = async (userId: string) => {
  return prisma.rating.aggregate({
    where: { toUserId: userId },
    _avg: { score: true },
    _count: { _all: true },
  });
};

export const getLatestRatingsForUser = async (userId: string, limit: number) => {
  return prisma.rating.findMany({
    where: { toUserId: userId },
    select: ratingSelect,
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
};

export const getRatingsByExchangeIdsForUser = async (exchangeIds: string[], fromUserId: string) => {
  if (exchangeIds.length === 0) {
    return [] as Array<{ exchangeId: string }>;
  }
  return prisma.rating.findMany({
    where: {
      exchangeId: { in: exchangeIds },
      fromUserId,
    },
    select: {
      exchangeId: true,
    },
  });
};

export const getAverageRatingsByUserIds = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return [] as Array<{ toUserId: string; _avg: { score: number | null } }>;
  }
  return prisma.rating.groupBy({
    by: ['toUserId'],
    where: { toUserId: { in: userIds } },
    _avg: { score: true },
  });
};

export const getRatingStatsByUserIds = async (userIds: string[]) => {
  if (userIds.length === 0) {
    return [] as Array<{ toUserId: string; _avg: { score: number | null }; _count: { _all: number } }>;
  }
  return prisma.rating.groupBy({
    by: ['toUserId'],
    where: { toUserId: { in: userIds } },
    _avg: { score: true },
    _count: { _all: true },
  });
};
