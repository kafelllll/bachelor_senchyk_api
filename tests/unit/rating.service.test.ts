import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const exchangeRepo = {
  findExchangeById: jest.fn(),
  countCompletedExchangesForUser: jest.fn(),
};

const ratingRepo = {
  findRatingByExchangeAndUser: jest.fn(),
  createRating: jest.fn(),
  getRatingSummary: jest.fn(),
  getLatestRatingsForUser: jest.fn(),
};

const userRepo = { findUserById: jest.fn() };
const emailSvc = { sendRatingNotificationEmail: jest.fn() };
const logger = { logger: { warn: jest.fn() } };

jest.unstable_mockModule('../../src/repositories/exchange.repository.js', () => exchangeRepo);
jest.unstable_mockModule('../../src/repositories/rating.repository.js', () => ratingRepo);
jest.unstable_mockModule('../../src/repositories/user.repository.js', () => userRepo);
jest.unstable_mockModule('../../src/services/email.service.js', () => emailSvc);
jest.unstable_mockModule('../../src/utils/logger.js', () => logger);

const ratingService = await import('../../src/services/rating.service.js');

describe('rating.service unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fails when exchange is not completed', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({
      id: 'ex-1',
      status: 'accepted',
      initiatorId: 'user-1',
      receiverId: 'user-2',
    });

    await expect(
      ratingService.createRating('user-1', { exchangeId: 'ex-1', score: 5 }),
    ).rejects.toThrow('Exchange is not completed');
  });

  it('fails when rating already exists', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({
      id: 'ex-1',
      status: 'completed',
      initiatorId: 'user-1',
      receiverId: 'user-2',
    });
    ratingRepo.findRatingByExchangeAndUser.mockResolvedValue({ id: 'r-existing' });

    await expect(
      ratingService.createRating('user-1', { exchangeId: 'ex-1', score: 5 }),
    ).rejects.toThrow('Rating already exists');
  });

  it('creates rating for the other participant', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({
      id: 'ex-1',
      status: 'completed',
      initiatorId: 'user-1',
      receiverId: 'user-2',
    });
    ratingRepo.findRatingByExchangeAndUser.mockResolvedValue(null);
    ratingRepo.createRating.mockResolvedValue({ id: 'r-1', exchangeId: 'ex-1', score: 4, comment: 'ok' });
    userRepo.findUserById.mockResolvedValue({ id: 'user-2', email: 'u2@test.com', name: 'U2' });

    const rating = await ratingService.createRating('user-1', {
      exchangeId: 'ex-1',
      score: 4,
      comment: 'ok',
    });

    expect(ratingRepo.createRating).toHaveBeenCalledWith(
      expect.objectContaining({
        fromUser: { connect: { id: 'user-1' } },
        toUser: { connect: { id: 'user-2' } },
        score: 4,
      }),
    );
    expect(rating.id).toBe('r-1');
  });
});
