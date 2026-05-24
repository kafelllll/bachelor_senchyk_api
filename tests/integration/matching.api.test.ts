import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  ensureTestDbConfigured,
  resetDatabase,
  disconnectDatabase,
  createUser,
  authHeaderForUser,
  createAnnouncement,
} from '../helpers/db.js';

let app;

beforeAll(async () => {
  ensureTestDbConfigured();

  jest.unstable_mockModule('../../src/services/email.service.js', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendMessageNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendExchangeInitiatedEmail: jest.fn().mockResolvedValue(undefined),
    sendRatingNotificationEmail: jest.fn().mockResolvedValue(undefined),
  }));

  const { createTestApp } = await import('../helpers/create-test-app.js');
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Matching API integration', () => {
  it('filters candidates by hard rules and sorts by relevance', async () => {
    const userA = await createUser({ email: 'm-a@test.local' });
    const userB = await createUser({ email: 'm-b@test.local' });
    const userC = await createUser({ email: 'm-c@test.local' });

    const base = await createAnnouncement(userA.id, {
      plantName: 'Monstera',
      offerType: 'offer',
      category: 'indoor',
      city: 'Kyiv',
      commonName: 'Monstera',
      genus: 'Monstera',
      family: 'Araceae',
      wateringFreq: 'moderate',
      lightReqs: 'bright',
      careLevel: 'easy',
    });

    await createAnnouncement(userB.id, {
      plantName: 'Monstera',
      offerType: 'looking-for',
      category: 'indoor',
      city: 'Kyiv',
      commonName: 'Monstera',
      genus: 'Monstera',
      family: 'Araceae',
      wateringFreq: 'moderate',
      lightReqs: 'bright',
      careLevel: 'easy',
    });

    await createAnnouncement(userC.id, {
      plantName: 'Indoor Request',
      offerType: 'looking-for',
      category: 'indoor',
      city: 'Lviv',
      commonName: 'Different',
      genus: 'Other',
      family: 'OtherFam',
      wateringFreq: 'rare',
      lightReqs: 'shade',
      careLevel: 'hard',
    });

    await createAnnouncement(userB.id, {
      plantName: 'Wrong type',
      offerType: 'offer',
      category: 'indoor',
    });

    await createAnnouncement(userB.id, {
      plantName: 'Wrong category',
      offerType: 'looking-for',
      category: 'other',
    });

    await createAnnouncement(userA.id, {
      plantName: 'Own candidate',
      offerType: 'looking-for',
      category: 'indoor',
    });

    await createAnnouncement(userB.id, {
      plantName: 'Inactive candidate',
      offerType: 'looking-for',
      category: 'indoor',
      status: 'inactive',
    });

    const auth = await authHeaderForUser(userA);
    const res = await request(app)
      .get(`/announcements/${base.id}/matches`)
      .set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.matches.length).toBeGreaterThanOrEqual(2);

    const ids = res.body.matches.map((m) => m.id);
    expect(ids).not.toContain(base.id);

    for (let i = 1; i < res.body.matches.length; i += 1) {
      expect(res.body.matches[i - 1].score).toBeGreaterThanOrEqual(res.body.matches[i].score);
    }

    expect(res.body.matches[0].score).toBeGreaterThanOrEqual(0);
    expect(res.body.matches[0].score).toBeLessThanOrEqual(100);
    expect(['high', 'medium', 'low']).toContain(res.body.matches[0].matchLevel);
  });

  it('returns aggregated recommendations for current user', async () => {
    const userA = await createUser({ email: 'm-rec-a@test.local' });
    const userB = await createUser({ email: 'm-rec-b@test.local' });

    await createAnnouncement(userA.id, {
      plantName: 'A offer',
      offerType: 'offer',
      category: 'indoor',
    });

    await createAnnouncement(userB.id, {
      plantName: 'B looking',
      offerType: 'looking-for',
      category: 'indoor',
    });

    const auth = await authHeaderForUser(userA);
    const res = await request(app)
      .get('/announcements/recommendations')
      .set('Authorization', auth);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.matches.length).toBeGreaterThanOrEqual(1);
  });
});
