import * as exchangeRepository from '../repositories/exchange.repository.js';
import * as ratingRepository from '../repositories/rating.repository.js';
import type { CreateRatingInput } from '../types/rating.types.js';

export const createRating = async (fromUserId: string, data: CreateRatingInput) => {
  const exchange = await exchangeRepository.findExchangeById(data.exchangeId);
  if (!exchange) {
    throw new Error('Exchange not found');
  }

  if (exchange.status !== 'completed') {
    throw new Error('Exchange is not completed');
  }

  if (exchange.initiatorId !== fromUserId && exchange.receiverId !== fromUserId) {
    throw new Error('Forbidden');
  }

  const otherUserId = exchange.initiatorId === fromUserId ? exchange.receiverId : exchange.initiatorId;
  if (data.toUserId && data.toUserId !== otherUserId) {
    throw new Error('Invalid rating target');
  }

  if (fromUserId === otherUserId) {
    throw new Error('Cannot rate yourself');
  }

  const existing = await ratingRepository.findRatingByExchangeAndUser(data.exchangeId, fromUserId);
  if (existing) {
    throw new Error('Rating already exists');
  }

  return ratingRepository.createRating({
    exchange: { connect: { id: data.exchangeId } },
    fromUser: { connect: { id: fromUserId } },
    toUser: { connect: { id: otherUserId } },
    score: data.score,
    comment: data.comment ?? null,
  });
};

export const getRatingsSummary = async (userId: string) => {
  const [summary, completedExchangesCount, latestReviews] = await Promise.all([
    ratingRepository.getRatingSummary(userId),
    exchangeRepository.countCompletedExchangesForUser(userId),
    ratingRepository.getLatestRatingsForUser(userId, 5),
  ]);

  const averageRating = summary._avg.score ? Number(summary._avg.score.toFixed(2)) : 0;
  const ratingsCount = summary._count._all ?? 0;

  return {
    averageRating,
    ratingsCount,
    completedExchangesCount,
    latestReviews,
  };
};
