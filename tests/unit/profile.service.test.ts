import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const userRepo = {
  findProfileByUserId: jest.fn(),
  updateUserById: jest.fn(),
  deleteUserCascade: jest.fn(),
};

const announcementRepo = {
  countActiveAnnouncements: jest.fn(),
  countAnnouncementsByUser: jest.fn(),
};

const exchangeRepo = {
  getExchangeSummaryForUser: jest.fn(),
};

const ratingService = {
  getRatingsSummary: jest.fn(),
};

jest.unstable_mockModule('../../src/repositories/user.repository.js', () => userRepo);
jest.unstable_mockModule('../../src/repositories/announcement.repository.js', () => announcementRepo);
jest.unstable_mockModule('../../src/repositories/exchange.repository.js', () => exchangeRepo);
jest.unstable_mockModule('../../src/services/rating.service.js', () => ratingService);

const profileService = await import('../../src/services/profile.service.js');

describe('profile.service unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    announcementRepo.countActiveAnnouncements.mockResolvedValue(2);
    announcementRepo.countAnnouncementsByUser.mockResolvedValue(5);
    exchangeRepo.getExchangeSummaryForUser.mockResolvedValue({
      activeCount: 2,
      completedCount: 1,
      cancelledCount: 0,
      totalCount: 3,
      lastExchangeAt: new Date(),
    });
    ratingService.getRatingsSummary.mockResolvedValue({
      averageRating: 5,
      ratingsCount: 2,
      completedExchangesCount: 2,
      latestReviews: [],
    });
  });

  it('returns profile with trust score and trust level', async () => {
    userRepo.findProfileByUserId.mockResolvedValue({
      id: 'u1',
      name: 'User',
      email: 'user@test.local',
      avatar: 'https://example.com/a.jpg',
      city: 'Kyiv',
      bio: 'Bio',
      emailVerified: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const result = await profileService.getMyProfile('u1');

    expect(result.trustScore).toBeGreaterThanOrEqual(80);
    expect(result.trustLevel).toBe('high');
    expect(result.isProfileVerified).toBe(true);
  });

  it('normalizes nullable profile fields on update', async () => {
    userRepo.updateUserById.mockResolvedValue({
      id: 'u1',
      name: 'Updated',
      email: 'user@test.local',
      avatar: null,
      city: null,
      bio: null,
      emailVerified: true,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    });

    const result = await profileService.updateMyProfile('u1', {
      name: 'Updated',
      avatar: null,
      city: '   ',
      bio: '   ',
    });

    expect(userRepo.updateUserById).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ name: 'Updated', avatar: null, city: null, bio: null }),
    );
    expect(result.name).toBe('Updated');
  });

  it('deletes account', async () => {
    await profileService.deleteMyAccount('u1');
    expect(userRepo.deleteUserCascade).toHaveBeenCalledWith('u1');
  });
});
