import * as announcementRepository from '../repositories/announcement.repository.js';
import * as exchangeRepository from '../repositories/exchange.repository.js';
import * as ratingRepository from '../repositories/rating.repository.js';
import type { CreateExchangeInput, UpdateExchangeStatusInput } from '../types/exchange.types.js';
import * as userRepository from '../repositories/user.repository.js';
import { sendExchangeInitiatedEmail } from './email.service.js';
import { logger } from '../utils/logger.js';

const allowedTransitions: Record<string, Array<'pending' | 'accepted' | 'completed' | 'cancelled'>> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['cancelled'],
  completed: [],
  cancelled: [],
};

type CompletionRole = 'seeker' | 'giver';

const normalizeOfferType = (value: string | null | undefined): 'offer' | 'looking-for' | null => {
  const lower = value?.trim().toLowerCase();
  if (!lower) {
    return null;
  }
  if (lower === 'offer' || lower === 'give' || lower === 'giveaway') {
    return 'offer';
  }
  if (lower === 'looking-for' || lower === 'looking_for' || lower === 'looking' || lower === 'seek' || lower === 'request') {
    return 'looking-for';
  }
  return null;
};

const getOppositeOfferType = (offerType: string | null | undefined): 'offer' | 'looking-for' | null => {
  const normalized = normalizeOfferType(offerType);
  if (normalized === 'offer') return 'looking-for';
  if (normalized === 'looking-for') return 'offer';
  return null;
};

const getCompletionRoles = (exchange: {
  initiatorId: string;
  receiverId: string;
  announcement: { offerType: string | null | undefined };
  offeredAnnouncement?: { offerType: string | null | undefined } | null;
}) => {
  const requestedOfferType = normalizeOfferType(exchange.announcement?.offerType);
  if (requestedOfferType === 'looking-for') {
    return {
      seekerId: exchange.receiverId,
      giverId: exchange.initiatorId,
    };
  }
  if (requestedOfferType === 'offer') {
    return {
      seekerId: exchange.initiatorId,
      giverId: exchange.receiverId,
    };
  }
  const offeredType = normalizeOfferType(exchange.offeredAnnouncement?.offerType);
  if (offeredType === 'offer') {
    return {
      seekerId: exchange.receiverId,
      giverId: exchange.initiatorId,
    };
  }
  if (offeredType === 'looking-for') {
    return {
      seekerId: exchange.initiatorId,
      giverId: exchange.receiverId,
    };
  }

  return {
    seekerId: exchange.initiatorId,
    giverId: exchange.receiverId,
  };
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
  const requestedAnnouncement = await announcementRepository.findAnnouncementByIdPublic(data.announcementId);
  if (!requestedAnnouncement) {
    throw new Error('Announcement not found');
  }

  if (requestedAnnouncement.userId === initiatorId) {
    throw new Error('Cannot create exchange for your own announcement');
  }

  if (data.receiverId && data.receiverId !== requestedAnnouncement.userId) {
    throw new Error('Receiver does not match announcement owner');
  }

  let offeredAnnouncementId: string | undefined;
  if (data.offeredAnnouncementId) {
    const offeredAnnouncement = await announcementRepository.findAnnouncementById(data.offeredAnnouncementId, initiatorId);
    if (!offeredAnnouncement) {
      throw new Error('Offered announcement not found');
    }
    offeredAnnouncementId = offeredAnnouncement.id;
  } else {
    const myActiveAnnouncements = await announcementRepository.findActiveAnnouncementsByUserForMatching(initiatorId);
    const expectedMyOfferType = getOppositeOfferType(requestedAnnouncement.offerType);
    const candidates = myActiveAnnouncements.filter((item: any) => {
      if (expectedMyOfferType && normalizeOfferType(item.offerType) !== expectedMyOfferType) return false;
      return item.category === requestedAnnouncement.category;
    });

    const bestAutoPick = candidates.sort(
      (a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )[0];

    if (!bestAutoPick) {
      throw new Error('No suitable offered announcement found');
    }
    offeredAnnouncementId = bestAutoPick.id;
  }

  if (!offeredAnnouncementId) {
    throw new Error('No suitable offered announcement found');
  }

  const existing = await exchangeRepository.findExchangeByParticipants({
    initiatorId,
    receiverId: requestedAnnouncement.userId,
    announcementId: data.announcementId,
  });
  if (existing) {
    if (existing.status !== 'cancelled') {
      throw new Error('Exchange already exists');
    }
    const updated = await exchangeRepository.reopenCancelledExchange({
      id: existing.id,
      offeredAnnouncementId: offeredAnnouncementId ?? null,
    });
    await notifyExchangeInitiated(
      initiatorId,
      requestedAnnouncement.userId,
      data.announcementId,
      requestedAnnouncement.plantName ?? 'Listing',
    );
    return updated;
  }

  const createPayload: Parameters<typeof exchangeRepository.createExchange>[0] = {
    initiator: { connect: { id: initiatorId } },
    receiver: { connect: { id: requestedAnnouncement.userId } },
    announcement: { connect: { id: data.announcementId } },
    offeredAnnouncement: { connect: { id: offeredAnnouncementId } },
  };
  const created = await exchangeRepository.createExchange(createPayload);

  await notifyExchangeInitiated(
    initiatorId,
    requestedAnnouncement.userId,
    data.announcementId,
    requestedAnnouncement.plantName ?? 'Listing',
  );
  return created;
};

const notifyExchangeInitiated = async (
  initiatorId: string,
  receiverId: string,
  announcementId: string,
  announcementTitle: string,
) => {
  try {
    const [initiator, receiver] = await Promise.all([
      userRepository.findUserById(initiatorId),
      userRepository.findUserById(receiverId),
    ]);
    if (!receiver?.email) return;
    await sendExchangeInitiatedEmail(receiver.email, {
      receiverName: receiver.name ?? 'User',
      receiverId: receiver.id,
      initiatorName: initiator?.name ?? 'User',
      initiatorId: initiator?.id ?? initiatorId,
      announcementId,
      announcementTitle,
    });
  } catch (error: any) {
    logger.warn('Failed to send exchange initiation email', {
      error: error?.message ?? 'Unknown error',
      receiverId,
    });
  }
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

  if (nextStatus === 'completed') {
    throw new Error('Use confirm completion endpoint');
  }

  const updated = await exchangeRepository.updateExchangeStatus({
    id: exchangeId,
    status: nextStatus,
    ...(nextStatus === 'cancelled'
      ? {
          completedAt: null,
          initiatorCompletedAt: null,
          receiverCompletedAt: null,
        }
      : {}),
  });

  return updated;
};

export const confirmExchangeCompletion = async (userId: string, exchangeId: string) => {
  const exchange = await exchangeRepository.findExchangeById(exchangeId);
  if (!exchange) {
    throw new Error('Exchange not found');
  }

  if (exchange.initiatorId !== userId && exchange.receiverId !== userId) {
    throw new Error('Forbidden');
  }

  if (exchange.status === 'completed') {
    throw new Error('Exchange already completed');
  }

  if (exchange.status !== 'accepted') {
    throw new Error('Exchange must be accepted before completion confirmation');
  }

  const roles = getCompletionRoles(exchange);
  const isSeeker = userId === roles.seekerId;
  const isGiver = userId === roles.giverId;
  if (!isSeeker && !isGiver) {
    throw new Error('Forbidden');
  }

  const actor: 'initiator' | 'receiver' = exchange.initiatorId === userId ? 'initiator' : 'receiver';
  const alreadyConfirmed =
    actor === 'initiator' ? Boolean(exchange.initiatorCompletedAt) : Boolean(exchange.receiverCompletedAt);

  if (alreadyConfirmed) {
    throw new Error('Completion already confirmed by this user');
  }

  const seekerConfirmed =
    roles.seekerId === exchange.initiatorId ? Boolean(exchange.initiatorCompletedAt) : Boolean(exchange.receiverCompletedAt);
  if (isGiver && !seekerConfirmed) {
    throw new Error('Seeker must confirm completion first');
  }

  const now = new Date();
  const oppositeConfirmed =
    actor === 'initiator' ? Boolean(exchange.receiverCompletedAt) : Boolean(exchange.initiatorCompletedAt);
  const shouldCompleteNow = oppositeConfirmed;

  const updated = await exchangeRepository.confirmExchangeCompletion({
    id: exchangeId,
    actor,
    confirmedAt: now,
    completeNow: shouldCompleteNow,
  });

  if (updated.status === 'completed') {
    await announcementRepository.updateAnnouncementStatusById(updated.announcementId, 'inactive');
  }

  return updated;
};

export const getExchangeRealtimeForUser = async (userId: string, exchangeId: string) => {
  const exchanges = await getMyExchanges(userId);
  return exchanges.find((exchange: { id: string }) => exchange.id === exchangeId) ?? null;
};

export const getExchangeRatingPromptState = async (userId: string, exchangeId: string) => {
  const exchange = await exchangeRepository.findExchangeById(exchangeId);
  if (!exchange) {
    return null;
  }

  if (exchange.initiatorId !== userId && exchange.receiverId !== userId) {
    return null;
  }

  const shouldPrompt = exchange.status === 'completed' && (await isRatingRequiredForExchange(userId, exchangeId));
  if (!shouldPrompt) {
    return {
      shouldPrompt: false,
      ratingTarget: null,
    };
  }

  const ratingTarget = exchange.initiatorId === userId ? exchange.receiver : exchange.initiator;
  return {
    shouldPrompt: true,
    ratingTarget,
  };
};

export const getMyExchanges = async (userId: string) => {
  const exchanges = await exchangeRepository.findExchangesForUser(userId);
  type ExchangeItem = Awaited<ReturnType<typeof exchangeRepository.findExchangesForUser>>[number];
  const sortedExchanges = [...exchanges].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  );

  const interlocutorIds = Array.from(
    new Set(
      sortedExchanges.map((exchange: ExchangeItem) =>
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

  const ratingRequiredIds = await buildRatingRequirement(sortedExchanges, userId);

  return sortedExchanges.map((exchange: ExchangeItem) => {
    const interlocutor = exchange.initiatorId === userId ? exchange.receiver : exchange.initiator;
    const rating = ratingMap.get(interlocutor.id) ?? { averageRating: 0, ratingsCount: 0 };
    const previewPhoto = exchange.announcement.coverPhoto || exchange.announcement.photos?.[0] || null;

    return {
      id: exchange.id,
      status: exchange.status,
      announcementId: exchange.announcementId,
      createdAt: exchange.createdAt,
      updatedAt: exchange.updatedAt,
      completedAt: exchange.completedAt,
      initiatorCompletedAt: exchange.initiatorCompletedAt,
      receiverCompletedAt: exchange.receiverCompletedAt,
      completionConfirmedByCurrentUser:
        exchange.initiatorId === userId ? Boolean(exchange.initiatorCompletedAt) : Boolean(exchange.receiverCompletedAt),
      completionConfirmedByOtherUser:
        exchange.initiatorId === userId ? Boolean(exchange.receiverCompletedAt) : Boolean(exchange.initiatorCompletedAt),
      completionRole: (exchange.initiatorId === userId
        ? (getCompletionRoles(exchange).seekerId === exchange.initiatorId ? 'seeker' : 'giver')
        : (getCompletionRoles(exchange).seekerId === exchange.receiverId ? 'seeker' : 'giver')) as CompletionRole,
      canConfirmCompletion:
        exchange.status === 'accepted' &&
        (() => {
          const roles = getCompletionRoles(exchange);
          const currentIsSeeker = userId === roles.seekerId;
          const currentConfirmed =
            exchange.initiatorId === userId ? Boolean(exchange.initiatorCompletedAt) : Boolean(exchange.receiverCompletedAt);
          const seekerConfirmed =
            roles.seekerId === exchange.initiatorId
              ? Boolean(exchange.initiatorCompletedAt)
              : Boolean(exchange.receiverCompletedAt);
          if (currentConfirmed) return false;
          if (currentIsSeeker) return true;
          return seekerConfirmed;
        })(),
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
      announcementId: exchange.announcementId,
      createdAt: exchange.createdAt,
      completedAt: exchange.completedAt,
      initiatorCompletedAt: exchange.initiatorCompletedAt,
      receiverCompletedAt: exchange.receiverCompletedAt,
      completionConfirmedByCurrentUser:
        exchange.initiatorId === userId ? Boolean(exchange.initiatorCompletedAt) : Boolean(exchange.receiverCompletedAt),
      completionConfirmedByOtherUser:
        exchange.initiatorId === userId ? Boolean(exchange.receiverCompletedAt) : Boolean(exchange.initiatorCompletedAt),
      completionRole: (exchange.initiatorId === userId
        ? (getCompletionRoles(exchange).seekerId === exchange.initiatorId ? 'seeker' : 'giver')
        : (getCompletionRoles(exchange).seekerId === exchange.receiverId ? 'seeker' : 'giver')) as CompletionRole,
      canConfirmCompletion:
        exchange.status === 'accepted' &&
        (() => {
          const roles = getCompletionRoles(exchange);
          const currentIsSeeker = userId === roles.seekerId;
          const currentConfirmed =
            exchange.initiatorId === userId ? Boolean(exchange.initiatorCompletedAt) : Boolean(exchange.receiverCompletedAt);
          const seekerConfirmed =
            roles.seekerId === exchange.initiatorId
              ? Boolean(exchange.initiatorCompletedAt)
              : Boolean(exchange.receiverCompletedAt);
          if (currentConfirmed) return false;
          if (currentIsSeeker) return true;
          return seekerConfirmed;
        })(),
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

