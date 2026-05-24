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

describe('Profile API integration', () => {
  it('gets and updates my profile', async () => {
    const user = await createUser({
      name: 'Profile User',
      email: 'profile@test.local',
      emailVerified: true,
    });
    const auth = await authHeaderForUser(user);

    const meRes = await request(app).get('/profile/me').set('Authorization', auth);
    expect(meRes.status).toBe(200);
    expect(meRes.body.profile.email).toBe('profile@test.local');

    const patchRes = await request(app)
      .patch('/profile/me')
      .set('Authorization', auth)
      .send({
        name: 'Updated Name',
        avatar: 'https://example.com/avatar.jpg',
        city: 'Kyiv',
        bio: 'I love plants',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.profile.name).toBe('Updated Name');
    expect(patchRes.body.profile.avatar).toBe('https://example.com/avatar.jpg');
    expect(patchRes.body.profile.city).toBe('Kyiv');
  });

  it('calculates high trust level for fully completed profile', async () => {
    const user = await createUser({
      name: 'Trusted User',
      email: 'trusted@test.local',
      emailVerified: true,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatar: 'https://example.com/a.jpg',
        city: 'Kyiv',
        bio: 'Long enough bio',
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    await createAnnouncement(user.id, { status: 'active' });
    await createAnnouncement(user.id, { status: 'active', plantName: 'Plant2' });
    await createAnnouncement(user.id, { status: 'active', plantName: 'Plant3' });

    const auth = await authHeaderForUser(user);
    const meRes = await request(app).get('/profile/me').set('Authorization', auth);

    expect(meRes.status).toBe(200);
    expect(meRes.body.profile.trustScore).toBeGreaterThanOrEqual(80);
    expect(meRes.body.profile.trustLevel).toBe('high');
  });

  it('returns public profile by id', async () => {
    const user = await createUser({ name: 'Public User', email: 'public@test.local' });

    const res = await request(app).get(`/profile/${user.id}`);

    expect(res.status).toBe(200);
    expect(res.body.profile.id).toBe(user.id);
  });

  it('deletes own account', async () => {
    const user = await createUser({ name: 'Delete User', email: 'delete@test.local' });
    const auth = await authHeaderForUser(user);

    const deleteRes = await request(app).delete('/profile/me').set('Authorization', auth);
    expect(deleteRes.status).toBe(200);

    const meRes = await request(app).get('/profile/me').set('Authorization', auth);
    expect(meRes.status).toBe(401);
  });
});
