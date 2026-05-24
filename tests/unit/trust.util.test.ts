import { describe, expect, it } from '@jest/globals';
import { calculateTrustScore } from '../../src/utils/trust.js';

const baseInput = {
  emailVerified: false,
  name: null,
  avatar: null,
  city: null,
  bio: null,
  activeAnnouncementsCount: 0,
  totalAnnouncementsCount: 0,
  createdAt: new Date(),
};

describe('trust util', () => {
  it('returns low level for minimal profile', () => {
    const result = calculateTrustScore(baseInput);
    expect(result.trustScore).toBe(0);
    expect(result.trustLevel).toBe('low');
  });

  it('returns basic level from 40 points', () => {
    const result = calculateTrustScore({
      ...baseInput,
      emailVerified: true,
      name: 'User',
    });

    expect(result.trustScore).toBe(40);
    expect(result.trustLevel).toBe('basic');
  });

  it('returns sufficient level from 60 points', () => {
    const result = calculateTrustScore({
      ...baseInput,
      emailVerified: true,
      name: 'User',
      avatar: 'https://example.com/a.jpg',
      city: 'Kyiv',
    });

    expect(result.trustScore).toBe(60);
    expect(result.trustLevel).toBe('sufficient');
  });

  it('returns high level from 80 points and caps at 100', () => {
    const result = calculateTrustScore({
      ...baseInput,
      emailVerified: true,
      name: 'User',
      avatar: 'https://example.com/a.jpg',
      city: 'Kyiv',
      bio: 'Hello',
      activeAnnouncementsCount: 3,
      totalAnnouncementsCount: 5,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });

    expect(result.trustScore).toBe(100);
    expect(result.trustLevel).toBe('high');
  });
});
