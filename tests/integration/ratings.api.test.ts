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

describe('Ratings API integration', () => {
  it('allows rating only after completed exchange and prevents duplicates', async () => {
    const initiator = await createUser({ email: 'rat-init@test.local' });
    const receiver = await createUser({ email: 'rat-rec@test.local' });

    const requested = await createAnnouncement(receiver.id, {
      plantName: 'Requested rate',
      offerType: 'offer',
      category: 'indoor',
    });

    const offered = await createAnnouncement(initiator.id, {
      plantName: 'Offered rate',
      offerType: 'looking-for',
      category: 'indoor',
    });

    const initAuth = await authHeaderForUser(initiator);
    const recvAuth = await authHeaderForUser(receiver);

    const createEx = await request(app)
      .post('/exchanges')
      .set('Authorization', initAuth)
      .send({ announcementId: requested.id, offeredAnnouncementId: offered.id });

    const exchangeId = createEx.body.exchange.id;

    const beforeCompleted = await request(app)
      .post('/ratings')
      .set('Authorization', initAuth)
      .send({
        exchangeId,
        toUserId: receiver.id,
        score: 5,
        comment: 'Great',
      });

    expect(beforeCompleted.status).toBe(400);

    await request(app)
      .patch(`/exchanges/${exchangeId}/status`)
      .set('Authorization', recvAuth)
      .send({ status: 'accepted' });

    await request(app)
      .post(`/exchanges/${exchangeId}/confirm-completion`)
      .set('Authorization', initAuth)
      .send({});

    await request(app)
      .post(`/exchanges/${exchangeId}/confirm-completion`)
      .set('Authorization', recvAuth)
      .send({});

    const firstRating = await request(app)
      .post('/ratings')
      .set('Authorization', initAuth)
      .send({
        exchangeId,
        toUserId: receiver.id,
        score: 5,
        comment: 'Great',
      });

    expect(firstRating.status).toBe(201);

    const duplicateRating = await request(app)
      .post('/ratings')
      .set('Authorization', initAuth)
      .send({
        exchangeId,
        toUserId: receiver.id,
        score: 4,
      });

    expect(duplicateRating.status).toBe(409);

    const summary = await request(app).get(`/users/${receiver.id}/ratings-summary`);
    expect(summary.status).toBe(200);
    expect(summary.body.summary.ratingsCount).toBeGreaterThanOrEqual(1);
    expect(summary.body.summary.averageRating).toBeGreaterThan(0);
    expect(Array.isArray(summary.body.summary.latestReviews)).toBe(true);
  });
});
