import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const exchangeRepo = {
  findExchangeById: jest.fn(),
  updateExchangeStatus: jest.fn(),
  confirmExchangeCompletion: jest.fn(),
  findExchangesForUser: jest.fn(),
  findExchangeByParticipants: jest.fn(),
  reopenCancelledExchange: jest.fn(),
  createExchange: jest.fn(),
  countCompletedExchangesForUser: jest.fn(),
  countPendingForReceiver: jest.fn(),
};

const announcementRepo = {
  updateAnnouncementStatusById: jest.fn(),
  findAnnouncementByIdPublic: jest.fn(),
  findAnnouncementById: jest.fn(),
  findActiveAnnouncementsByUserForMatching: jest.fn(),
};

const ratingRepo = {
  getRatingsByExchangeIdsForUser: jest.fn(),
  getRatingStatsByUserIds: jest.fn(),
};

const userRepo = { findUserById: jest.fn() };
const emailSvc = { sendExchangeInitiatedEmail: jest.fn() };
const logger = { logger: { warn: jest.fn() } };

jest.unstable_mockModule('../../src/repositories/exchange.repository.js', () => exchangeRepo);
jest.unstable_mockModule('../../src/repositories/announcement.repository.js', () => announcementRepo);
jest.unstable_mockModule('../../src/repositories/rating.repository.js', () => ratingRepo);
jest.unstable_mockModule('../../src/repositories/user.repository.js', () => userRepo);
jest.unstable_mockModule('../../src/services/email.service.js', () => emailSvc);
jest.unstable_mockModule('../../src/utils/logger.js', () => logger);

const exchangeService = await import('../../src/services/exchange.service.js');

const baseExchange = {
  id: 'ex-1',
  initiatorId: 'user-1',
  receiverId: 'user-2',
  announcementId: 'ann-1',
  status: 'accepted',
  completedAt: null,
  initiatorCompletedAt: null,
  receiverCompletedAt: null,
  announcement: { offerType: 'offer' },
  offeredAnnouncement: null,
  initiator: { id: 'user-1', name: 'A', avatar: null },
  receiver: { id: 'user-2', name: 'B', avatar: null },
};

describe('exchange.service unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ratingRepo.getRatingsByExchangeIdsForUser.mockResolvedValue([]);
    ratingRepo.getRatingStatsByUserIds.mockResolvedValue([]);
  });

  it('blocks direct transition to completed in updateExchangeStatus', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({ ...baseExchange, status: 'accepted' });

    await expect(
      exchangeService.updateExchangeStatus('user-1', 'ex-1', { status: 'completed' }),
    ).rejects.toThrow('Invalid status transition');
  });

  it('prevents giver from confirming completion before seeker', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({ ...baseExchange, initiatorCompletedAt: null, receiverCompletedAt: null });

    await expect(exchangeService.confirmExchangeCompletion('user-2', 'ex-1')).rejects.toThrow(
      'Seeker must confirm completion first',
    );
  });

  it('completes exchange on second confirmation and deactivates announcement', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({
      ...baseExchange,
      initiatorCompletedAt: new Date('2026-05-20T10:00:00.000Z'),
      receiverCompletedAt: null,
    });

    exchangeRepo.confirmExchangeCompletion.mockResolvedValue({
      ...baseExchange,
      status: 'completed',
      completedAt: new Date('2026-05-20T10:05:00.000Z'),
      initiatorCompletedAt: new Date('2026-05-20T10:00:00.000Z'),
      receiverCompletedAt: new Date('2026-05-20T10:05:00.000Z'),
    });

    const result = await exchangeService.confirmExchangeCompletion('user-2', 'ex-1');

    expect(exchangeRepo.confirmExchangeCompletion).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ex-1', actor: 'receiver', completeNow: true }),
    );
    expect(announcementRepo.updateAnnouncementStatusById).toHaveBeenCalledWith('ann-1', 'inactive');
    expect(result.status).toBe('completed');
  });

  it('returns rating prompt when completed exchange is not rated yet', async () => {
    exchangeRepo.findExchangeById.mockResolvedValue({
      ...baseExchange,
      status: 'completed',
    });
    ratingRepo.getRatingsByExchangeIdsForUser.mockResolvedValue([]);

    const prompt = await exchangeService.getExchangeRatingPromptState('user-1', 'ex-1');

    expect(prompt).toEqual({
      shouldPrompt: true,
      ratingTarget: { id: 'user-2', name: 'B', avatar: null },
    });
  });

  it('sorts my exchanges by createdAt descending', async () => {
    exchangeRepo.findExchangesForUser.mockResolvedValue([
      {
        ...baseExchange,
        id: 'ex-old',
        createdAt: new Date('2026-05-20T10:00:00.000Z'),
        updatedAt: new Date('2026-05-22T10:00:00.000Z'),
      },
      {
        ...baseExchange,
        id: 'ex-new',
        createdAt: new Date('2026-05-25T10:00:00.000Z'),
        updatedAt: new Date('2026-05-25T12:00:00.000Z'),
      },
    ]);

    const exchanges = await exchangeService.getMyExchanges('user-1');

    expect(exchanges.map((item) => item.id)).toEqual(['ex-new', 'ex-old']);
  });
});
