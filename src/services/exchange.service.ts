import * as announcementRepository from '../repositories/announcement.repository.js';
import * as exchangeRepository from '../repositories/exchange.repository.js';
import * as ratingRepository from '../repositories/rating.repository.js';
import type { CreateExchangeInput, UpdateExchangeStatusInput } from '../types/exchange.types.js';

const allowedTransitions: Record<string, Array<'pending' | 'accepted' | 'completed' | 'cancelled'>> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

const getOtherParticipantId = (exchange: { initiatorId: string; receiverId: string }, userId: string) => {
  return exchange.initiatorId === userId ? exchange.receiverId : exchange.initiatorId;
};

const buildRatingRequirement = async (
  exchanges: Array<{ id: string; status: string }>,
  userId: string,
) => {
  const completedIds = exchanges.filter((exchange) => exchange.status === 'completed').map((exchange) => exchange.id);
  const existing = await ratingRepository.getRatingsByExchangeIdsForUser(completedIds, userId);
  type RatingRow = Awaited<ReturnType<typeof ratingRepository.getRatingsByExchangeIdsForUser>>[number];
  const rated = new Set(existing.map((row: RatingRow) => row.exchangeId));
  return new Set(completedIds.filter((id) => !rated.has(id)));
};

export const createExchange = async (initiatorId: string, data: CreateExchangeInput) => {
  const announcement = await announcementRepository.findAnnouncementByIdPublic(data.announcementId);
  if (!announcement) {
    throw new Error('Announcement not found');
  }

  if (announcement.userId === initiatorId) {
    throw new Error('Cannot create exchange for your own announcement');
  }

  if (data.receiverId && data.receiverId !== announcement.userId) {
    throw new Error('Receiver does not match announcement owner');
  }

  const existing = await exchangeRepository.findExchangeByParticipants({
    initiatorId,
    receiverId: announcement.userId,
    announcementId: data.announcementId,
  });
  if (existing) {
    if (existing.status !== 'cancelled') {
      throw new Error('Exchange already exists');
    }
    return exchangeRepository.updateExchangeStatus({
      id: existing.id,
      status: 'pending',
      completedAt: null,
    });
  }

  return exchangeRepository.createExchange({
    initiator: { connect: { id: initiatorId } },
    receiver: { connect: { id: announcement.userId } },
    announcement: { connect: { id: data.announcementId } },
  });
};

export const updateExchangeStatus = async (
  userId: string,
  exchangeId: string,
  data: UpdateExchangeStatusInput,
) => {
  const exchange = await exchangeRepository.findExchangeById(exchangeId);
  if (!exchange) {
    throw new Error('Exchange not found');
  }

  if (exchange.initiatorId !== userId && exchange.receiverId !== userId) {
    throw new Error('Forbidden');
  }

  const currentStatus = exchange.status;
  const nextStatus = data.status;
  if (currentStatus === nextStatus) {
    return exchange;
  }

  if (nextStatus === 'accepted' && exchange.receiverId !== userId) {
    throw new Error('Only receiver can accept exchange');
  }

  const allowed = allowedTransitions[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    throw new Error('Invalid status transition');
  }

  const completedAt = nextStatus === 'completed' ? new Date() : null;
  const updated = await exchangeRepository.updateExchangeStatus({
    id: exchangeId,
    status: nextStatus,
    completedAt,
  });

  if (nextStatus === 'completed') {
    await announcementRepository.updateAnnouncementStatusById(updated.announcementId, 'inactive');
  }

  return updated;
};

export const getMyExchanges = async (userId: string) => {
  const exchanges = await exchangeRepository.findExchangesForUser(userId);
  type ExchangeItem = Awaited<ReturnType<typeof exchangeRepository.findExchangesForUser>>[number];

  const interlocutorIds = Array.from(
    new Set(
      exchanges.map((exchange: ExchangeItem) =>
        exchange.initiatorId === userId ? exchange.receiverId : exchange.initiatorId,
      ),
    ),
  ) as string[];

  const ratingStats = await ratingRepository.getRatingStatsByUserIds(interlocutorIds);
  type RatingStat = Awaited<ReturnType<typeof ratingRepository.getRatingStatsByUserIds>>[number];
  const ratingMap = new Map<string, { averageRating: number; ratingsCount: number }>();
  ratingStats.forEach((row: RatingStat) => {
    const avg = row._avg.score ? Number(row._avg.score.toFixed(2)) : 0;
    ratingMap.set(row.toUserId, { averageRating: avg, ratingsCount: row._count._all ?? 0 });
  });

  const ratingRequiredIds = await buildRatingRequirement(exchanges, userId);

  return exchanges.map((exchange: ExchangeItem) => {
    const interlocutor = exchange.initiatorId === userId ? exchange.receiver : exchange.initiator;
    const rating = ratingMap.get(interlocutor.id) ?? { averageRating: 0, ratingsCount: 0 };
    const previewPhoto = exchange.announcement.coverPhoto || exchange.announcement.photos?.[0] || null;
    return {
      id: exchange.id,
      status: exchange.status,
      createdAt: exchange.createdAt,
      updatedAt: exchange.updatedAt,
      completedAt: exchange.completedAt,
      ratingRequired: ratingRequiredIds.has(exchange.id),
      ratingTarget: ratingRequiredIds.has(exchange.id) ? interlocutor : null,
      interlocutor: {
        ...interlocutor,
        rating,
      },
      announcement: {
        ...exchange.announcement,
        previewPhoto,
      },
    };
  });
};

export const getExchangeHistory = async (userId: string) => {
  const exchanges = await exchangeRepository.findExchangesForUser(userId);
  type ExchangeItem = Awaited<ReturnType<typeof exchangeRepository.findExchangesForUser>>[number];

  const interlocutorIds = Array.from(
    new Set(
      exchanges.map((exchange: ExchangeItem) =>
        exchange.initiatorId === userId ? exchange.receiverId : exchange.initiatorId,
      ),
    ),
  ) as string[];

  const ratingStats = await ratingRepository.getRatingStatsByUserIds(interlocutorIds);
  type RatingStat = Awaited<ReturnType<typeof ratingRepository.getRatingStatsByUserIds>>[number];
  const ratingMap = new Map<string, { averageRating: number; ratingsCount: number }>();
  ratingStats.forEach((row: RatingStat) => {
    const avg = row._avg.score ? Number(row._avg.score.toFixed(2)) : 0;
    ratingMap.set(row.toUserId, { averageRating: avg, ratingsCount: row._count._all ?? 0 });
  });

  const ratingRequiredIds = await buildRatingRequirement(exchanges, userId);

  const mapped = exchanges.map((exchange: ExchangeItem) => {
    const interlocutor = exchange.initiatorId === userId ? exchange.receiver : exchange.initiator;
    const rating = ratingMap.get(interlocutor.id) ?? { averageRating: 0, ratingsCount: 0 };
    const previewPhoto = exchange.announcement.coverPhoto || exchange.announcement.photos?.[0] || null;
    return {
      id: exchange.id,
      status: exchange.status,
      createdAt: exchange.createdAt,
      completedAt: exchange.completedAt,
      ratingRequired: ratingRequiredIds.has(exchange.id),
      ratingTarget: ratingRequiredIds.has(exchange.id) ? interlocutor : null,
      interlocutor: {
        ...interlocutor,
        rating,
      },
      announcement: {
        ...exchange.announcement,
        previewPhoto,
      },
    };
  });

  return {
    active: mapped.filter((item: ExchangeItem) => item.status === 'pending' || item.status === 'accepted'),
    completed: mapped.filter((item: ExchangeItem) => item.status === 'completed'),
    cancelled: mapped.filter((item: ExchangeItem) => item.status === 'cancelled'),
  };
};

export const getCompletedExchangeCount = async (userId: string) => {
  return exchangeRepository.countCompletedExchangesForUser(userId);
};

export const getPendingExchangeCount = async (userId: string) => {
  return exchangeRepository.countPendingForReceiver(userId);
};


export const isRatingRequiredForExchange = async (userId: string, exchangeId: string) => {
  const existing = await ratingRepository.getRatingsByExchangeIdsForUser([exchangeId], userId);
  return existing.length === 0;
};
