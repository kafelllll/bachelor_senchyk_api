import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import {
  ensureTestDbConfigured,
  resetDatabase,
  disconnectDatabase,
  createUser,
  authHeaderForUser,
  createAnnouncement,
  prisma,
} from '../helpers/db.js';

let app;

const createPayload = {
  plantName: 'Monstera Deliciosa',
  offerType: 'offer',
  category: 'indoor',
  size: 'medium',
  condition: 'healthy',
  careLevel: 'easy',
  city: 'Kyiv',
  genus: 'Monstera',
  family: 'Araceae',
  commonName: 'Monstera',
  description: 'Healthy plant available for exchange',
  wateringFreq: 'moderate',
  lightReqs: 'bright',
  additionalTags: ['green'],
};

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

describe('Announcements API integration', () => {
  it('creates announcement and validates required fields', async () => {
    const owner = await createUser({ email: 'owner-ann@test.local' });
    const auth = await authHeaderForUser(owner);

    const badRes = await request(app).post('/announcements').set('Authorization', auth).send({
      plantName: '',
    });
    expect(badRes.status).toBe(400);

    const okRes = await request(app).post('/announcements').set('Authorization', auth).send(createPayload);
    expect(okRes.status).toBe(201);
    expect(okRes.body.success).toBe(true);
    expect(okRes.body.announcement.plantName).toBe('Monstera Deliciosa');
  });

  it('updates/deletes by owner and blocks non-owner access', async () => {
    const owner = await createUser({ email: 'owner2@test.local' });
    const other = await createUser({ email: 'other2@test.local' });
    const ownerAuth = await authHeaderForUser(owner);
    const otherAuth = await authHeaderForUser(other);

    const created = await createAnnouncement(owner.id, {
      plantName: 'Owner Plant',
      offerType: 'offer',
      category: 'indoor',
      size: 'medium',
      condition: 'healthy',
      careLevel: 'easy',
      city: 'Kyiv',
      genus: 'Ficus',
      family: 'Moraceae',
      commonName: 'Rubber plant',
      description: 'Owner plant description',
      wateringFreq: 'moderate',
      lightReqs: 'bright',
    });

    const deniedUpdate = await request(app)
      .patch(`/announcements/${created.id}`)
      .set('Authorization', otherAuth)
      .send({ description: 'Hacked description text' });
    expect(deniedUpdate.status).toBe(403);

    const ownerUpdate = await request(app)
      .patch(`/announcements/${created.id}`)
      .set('Authorization', ownerAuth)
      .send({ description: 'Updated owner description text' });
    expect(ownerUpdate.status).toBe(200);

    const deniedDelete = await request(app)
      .delete(`/announcements/${created.id}`)
      .set('Authorization', otherAuth);
    expect(deniedDelete.status).toBe(403);

    const ownerDelete = await request(app)
      .delete(`/announcements/${created.id}`)
      .set('Authorization', ownerAuth);
    expect(ownerDelete.status).toBe(200);
  });

  it('returns feed, my announcements, and filtered search results', async () => {
    const owner = await createUser({ email: 'owner3@test.local' });
    const viewer = await createUser({ email: 'viewer3@test.local' });

    await createAnnouncement(owner.id, { plantName: 'Indoor A', category: 'indoor', city: 'Kyiv', offerType: 'offer' });
    await createAnnouncement(owner.id, { plantName: 'Other B', category: 'other', city: 'Lviv', offerType: 'offer' });

    const viewerAuth = await authHeaderForUser(viewer);
    const ownerAuth = await authHeaderForUser(owner);

    const feedRes = await request(app).get('/announcements').set('Authorization', viewerAuth);
    expect(feedRes.status).toBe(200);
    expect(feedRes.body.announcements.length).toBeGreaterThanOrEqual(2);

    const myRes = await request(app).get('/announcements/me').set('Authorization', ownerAuth);
    expect(myRes.status).toBe(200);
    expect(myRes.body.announcements.every((a) => a.userId === owner.id)).toBe(true);

    const searchRes = await request(app)
      .get('/announcements/search')
      .set('Authorization', viewerAuth)
      .query({ category: 'indoor', city: 'Kyiv' });

    expect(searchRes.status).toBe(200);
    expect(Array.isArray(searchRes.body.items)).toBe(true);
    expect(searchRes.body.items.length).toBeGreaterThanOrEqual(1);
    expect(searchRes.body.items.some((a) => a.category === 'indoor')).toBe(true);
  });
});
