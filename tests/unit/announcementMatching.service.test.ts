import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const announcementRepo = {
  findAnnouncementById: jest.fn(),
  findMatchingCandidates: jest.fn(),
  findActiveAnnouncementsByUserForMatching: jest.fn(),
};

const ratingRepo = {
  getAverageRatingsByUserIds: jest.fn(),
};

const userStatsService = {
  getUserStatsMap: jest.fn(),
};

const loggerMock = { logger: { debug: jest.fn(), warn: jest.fn() } };

jest.unstable_mockModule('../../src/repositories/announcement.repository.js', () => announcementRepo);
jest.unstable_mockModule('../../src/repositories/rating.repository.js', () => ratingRepo);
jest.unstable_mockModule('../../src/services/userStats.service.js', () => userStatsService);
jest.unstable_mockModule('../../src/utils/logger.js', () => loggerMock);

const matchingService = await import('../../src/services/announcementMatching.service.js');

const baseAnnouncement = {
  id: 'a-base',
  plantName: 'Ficus',
  userId: 'u1',
  offerType: 'offer',
  category: 'indoor',
  size: 'medium',
  condition: 'healthy',
  careLevel: 'easy',
  city: 'Kyiv',
  district: 'Center',
  additionalTags: ['green'],
  pestFree: true,
  readyToExchange: true,
  genus: 'Ficus',
  family: 'Moraceae',
  commonName: 'Rubber plant',
  wateringFreq: 'moderate',
  lightReqs: 'bright',
  humidity: 'medium',
  toxicity: 'slightly-toxic',
  growthRate: 'moderate',
  hasOffspring: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('announcementMatching.service unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userStatsService.getUserStatsMap.mockResolvedValue(new Map());
    ratingRepo.getAverageRatingsByUserIds.mockResolvedValue([]);
  });

  it('ignores own/wrong type/wrong category via hard filters', async () => {
    announcementRepo.findAnnouncementById.mockResolvedValue(baseAnnouncement);
    announcementRepo.findMatchingCandidates.mockResolvedValue([
      {
        id: 'm-valid',
        userId: 'u2',
        offerType: 'looking-for',
        category: 'indoor',
        plantName: 'Ficus',
        size: 'medium',
        condition: 'healthy',
        careLevel: 'easy',
        city: 'Kyiv',
        district: 'Center',
        additionalTags: ['green'],
        pestFree: true,
        readyToExchange: true,
        genus: 'Ficus',
        family: 'Moraceae',
        commonName: 'Rubber plant',
        wateringFreq: 'moderate',
        lightReqs: 'bright',
        humidity: 'medium',
        toxicity: 'slightly-toxic',
        growthRate: 'moderate',
        hasOffspring: false,
        photos: [],
        coverPhoto: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'u2', name: 'U2', avatar: null },
      },
      {
        id: 'm-own',
        userId: 'u1',
        offerType: 'looking-for',
        category: 'indoor',
        plantName: 'Ficus',
        size: 'medium',
        condition: 'healthy',
        careLevel: 'easy',
        city: 'Kyiv',
        district: 'Center',
        additionalTags: [],
        pestFree: true,
        readyToExchange: true,
        genus: 'Ficus',
        family: 'Moraceae',
        commonName: 'Rubber plant',
        wateringFreq: 'moderate',
        lightReqs: 'bright',
        humidity: 'medium',
        toxicity: 'slightly-toxic',
        growthRate: 'moderate',
        hasOffspring: false,
        photos: [],
        coverPhoto: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'u1', name: 'U1', avatar: null },
      },
    ]);

    const matches = await matchingService.getAnnouncementMatches('u1', 'a-base');

    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('m-valid');
  });

  it('returns score normalized to 0..100 and sorted by relevance', async () => {
    announcementRepo.findAnnouncementById.mockResolvedValue(baseAnnouncement);
    announcementRepo.findMatchingCandidates.mockResolvedValue([
      {
        id: 'm-high',
        userId: 'u2',
        offerType: 'looking-for',
        category: 'indoor',
        plantName: 'Ficus',
        size: 'medium',
        condition: 'healthy',
        careLevel: 'easy',
        city: 'Kyiv',
        district: 'Center',
        additionalTags: ['green'],
        pestFree: true,
        readyToExchange: true,
        genus: 'Ficus',
        family: 'Moraceae',
        commonName: 'Rubber plant',
        wateringFreq: 'moderate',
        lightReqs: 'bright',
        humidity: 'medium',
        toxicity: 'slightly-toxic',
        growthRate: 'moderate',
        hasOffspring: false,
        photos: [],
        coverPhoto: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'u2', name: 'U2', avatar: null },
      },
      {
        id: 'm-low',
        userId: 'u3',
        offerType: 'looking-for',
        category: 'indoor',
        plantName: 'Monstera Candidate',
        size: 'small',
        condition: 'healthy',
        careLevel: 'medium',
        city: 'Lviv',
        district: 'North',
        additionalTags: ['green'],
        pestFree: false,
        readyToExchange: true,
        genus: 'Monstera',
        family: 'Araceae',
        commonName: 'Monstera',
        wateringFreq: 'moderate',
        lightReqs: 'partial',
        humidity: 'low',
        toxicity: 'slightly-toxic',
        growthRate: 'moderate',
        hasOffspring: false,
        photos: [],
        coverPhoto: null,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 365),
        user: { id: 'u3', name: 'U3', avatar: null },
      },
    ]);

    const matches = await matchingService.getAnnouncementMatches('u1', 'a-base');

    expect(matches).toHaveLength(2);
    expect(matches[0].id).toBe('m-high');
    expect(matches[0].score).toBeGreaterThan(matches[1].score);
    expect(matches[0].score).toBeLessThanOrEqual(100);
    expect(matches[1].score).toBeGreaterThanOrEqual(0);
    expect(['high', 'medium', 'low']).toContain(matches[0].matchLevel);
  });
});
