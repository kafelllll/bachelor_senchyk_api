import prisma from '../config/prisma.js';
const exchangeSelect = {
    id: true,
    initiatorId: true,
    receiverId: true,
    announcementId: true,
    offeredAnnouncementId: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    completedAt: true,
    initiatorCompletedAt: true,
    receiverCompletedAt: true,
    initiator: {
        select: {
            id: true,
            name: true,
            avatar: true,
        },
    },
    receiver: {
        select: {
            id: true,
            name: true,
            avatar: true,
        },
    },
    announcement: {
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
        },
    },
    offeredAnnouncement: {
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
        },
    },
};
export const createExchange = async (data) => {
    return prisma.exchange.create({ data, select: exchangeSelect });
};
export const findActiveExchangeByInitiator = async (params) => {
    const { initiatorId, announcementId } = params;
    return prisma.exchange.findFirst({
        where: {
            initiatorId,
            announcementId,
            status: { in: ['pending', 'accepted'] },
        },
        select: exchangeSelect,
    });
};
export const findExchangeById = async (id) => {
    return prisma.exchange.findUnique({
        where: { id },
        select: exchangeSelect,
    });
};
export const findExchangeByParticipants = async (params) => {
    const { initiatorId, receiverId, announcementId } = params;
    return prisma.exchange.findFirst({
        where: {
            initiatorId,
            receiverId,
            announcementId,
        },
        select: exchangeSelect,
    });
};
export const findExchangesForUser = async (userId) => {
    return prisma.exchange.findMany({
        where: {
            OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
        select: exchangeSelect,
        orderBy: { updatedAt: 'desc' },
    });
};
export const updateExchangeStatus = async (params) => {
    const { id, status, completedAt, initiatorCompletedAt, receiverCompletedAt } = params;
    return prisma.exchange.update({
        where: { id },
        data: {
            status,
            ...(completedAt !== undefined ? { completedAt } : {}),
            ...(initiatorCompletedAt !== undefined ? { initiatorCompletedAt } : {}),
            ...(receiverCompletedAt !== undefined ? { receiverCompletedAt } : {}),
        },
        select: exchangeSelect,
    });
};
export const reopenCancelledExchange = async (params) => {
    const { id, offeredAnnouncementId } = params;
    return prisma.exchange.update({
        where: { id },
        data: {
            status: 'pending',
            completedAt: null,
            initiatorCompletedAt: null,
            receiverCompletedAt: null,
            offeredAnnouncementId: offeredAnnouncementId ?? null,
        },
        select: exchangeSelect,
    });
};
export const confirmExchangeCompletion = async (params) => {
    const { id, actor, confirmedAt, completeNow } = params;
    const completionPatch = actor === 'initiator'
        ? { initiatorCompletedAt: confirmedAt }
        : { receiverCompletedAt: confirmedAt };
    return prisma.exchange.update({
        where: { id },
        data: {
            ...completionPatch,
            ...(completeNow
                ? {
                    status: 'completed',
                    completedAt: confirmedAt,
                }
                : {}),
        },
        select: exchangeSelect,
    });
};
export const countCompletedExchangesForUser = async (userId) => {
    return prisma.exchange.count({
        where: {
            status: 'completed',
            OR: [{ initiatorId: userId }, { receiverId: userId }],
        },
    });
};
export const countPendingForReceiver = async (userId) => {
    return prisma.exchange.count({
        where: {
            receiverId: userId,
            status: 'pending',
        },
    });
};
export const getExchangeSummaryForUser = async (userId) => {
    const where = {
        OR: [{ initiatorId: userId }, { receiverId: userId }],
    };
    const [statusCounts, lastUpdate] = await Promise.all([
        prisma.exchange.groupBy({
            by: ['status'],
            where,
            _count: { _all: true },
        }),
        prisma.exchange.aggregate({
            where,
            _max: { updatedAt: true },
        }),
    ]);
    const counts = new Map();
    statusCounts.forEach((row) => {
        counts.set(row.status, row._count._all ?? 0);
    });
    const pendingCount = counts.get('pending') ?? 0;
    const acceptedCount = counts.get('accepted') ?? 0;
    const completedCount = counts.get('completed') ?? 0;
    const cancelledCount = counts.get('cancelled') ?? 0;
    return {
        activeCount: pendingCount + acceptedCount,
        completedCount,
        cancelledCount,
        totalCount: pendingCount + acceptedCount + completedCount + cancelledCount,
        lastExchangeAt: lastUpdate._max.updatedAt ?? null,
    };
};
export const getCompletedCountsByUserIds = async (userIds) => {
    if (userIds.length === 0) {
        return [];
    }
    const [initiatorCounts, receiverCounts] = await Promise.all([
        prisma.exchange.groupBy({
            by: ['initiatorId'],
            where: {
                status: 'completed',
                initiatorId: { in: userIds },
            },
            _count: { _all: true },
        }),
        prisma.exchange.groupBy({
            by: ['receiverId'],
            where: {
                status: 'completed',
                receiverId: { in: userIds },
            },
            _count: { _all: true },
        }),
    ]);
    const counts = new Map();
    initiatorCounts.forEach((row) => {
        counts.set(row.initiatorId, row._count._all ?? 0);
    });
    receiverCounts.forEach((row) => {
        counts.set(row.receiverId, (counts.get(row.receiverId) ?? 0) + (row._count._all ?? 0));
    });
    return Array.from(counts.entries()).map(([userId, count]) => ({ userId, count }));
};