import * as ratingRepository from '../repositories/rating.repository.js';
import * as exchangeRepository from '../repositories/exchange.repository.js';

type UserStats = {
  averageRating: number;
  ratingsCount: number;
  completedExchangesCount: number;
};

export const getUserStatsMap = async (userIds: string[]) => {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) {
    return new Map<string, UserStats>();
  }

  const [ratingStats, completedCounts] = await Promise.all([
    ratingRepository.getRatingStatsByUserIds(uniqueIds),
    exchangeRepository.getCompletedCountsByUserIds(uniqueIds),
  ]);

  const ratingMap = new Map<string, UserStats>();
  type RatingRow = Awaited<ReturnType<typeof ratingRepository.getRatingStatsByUserIds>>[number];
  ratingStats.forEach((row: RatingRow) => {
    const avg = row._avg.score ? Number(row._avg.score.toFixed(2)) : 0;
    ratingMap.set(row.toUserId, {
      averageRating: avg,
      ratingsCount: row._count._all ?? 0,
      completedExchangesCount: 0,
    });
  });

  completedCounts.forEach((row) => {
    const existing = ratingMap.get(row.userId) ?? {
      averageRating: 0,
      ratingsCount: 0,
      completedExchangesCount: 0,
    };
    ratingMap.set(row.userId, {
      ...existing,
      completedExchangesCount: row.count,
    });
  });

  uniqueIds.forEach((userId) => {
    if (!ratingMap.has(userId)) {
      ratingMap.set(userId, {
        averageRating: 0,
        ratingsCount: 0,
        completedExchangesCount: 0,
      });
    }
  });

  return ratingMap;
};
