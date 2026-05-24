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

describe('Messages API integration', () => {
  it('creates message, tracks unread, marks read, lists and deletes conversation', async () => {
    const sender = await createUser({ email: 'msg-s@test.local' });
    const receiver = await createUser({ email: 'msg-r@test.local' });
    const outsider = await createUser({ email: 'msg-o@test.local' });

    const announcement = await createAnnouncement(sender.id, {
      plantName: 'Message plant',
      offerType: 'offer',
      category: 'indoor',
    });

    const senderAuth = await authHeaderForUser(sender);
    const receiverAuth = await authHeaderForUser(receiver);
    const outsiderAuth = await authHeaderForUser(outsider);

    const selfMsg = await request(app)
      .post('/messages')
      .set('Authorization', senderAuth)
      .send({ receiverId: sender.id, content: 'self' });
    expect(selfMsg.status).toBe(400);

    const createRes = await request(app)
      .post('/messages')
      .set('Authorization', senderAuth)
      .send({
        receiverId: receiver.id,
        announcementId: announcement.id,
        content: '  Hello   there  ',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.message.content).toBe('Hello there');

    const unreadBefore = await request(app)
      .get('/messages/unread-count')
      .set('Authorization', receiverAuth);
    expect(unreadBefore.status).toBe(200);
    expect(unreadBefore.body.unreadCount).toBe(1);

    const conv = await request(app)
      .get('/messages')
      .set('Authorization', receiverAuth)
      .query({ userId: sender.id, announcementId: announcement.id });
    expect(conv.status).toBe(200);
    expect(conv.body.messages.length).toBe(1);

    const unreadAfter = await request(app)
      .get('/messages/unread-count')
      .set('Authorization', receiverAuth);
    expect(unreadAfter.status).toBe(200);
    expect(unreadAfter.body.unreadCount).toBe(0);

    const list = await request(app)
      .get('/messages/conversations')
      .set('Authorization', receiverAuth);
    expect(list.status).toBe(200);
    expect(list.body.conversations.length).toBeGreaterThanOrEqual(1);

    const outsiderConv = await request(app)
      .get('/messages')
      .set('Authorization', outsiderAuth)
      .query({ userId: sender.id });
    expect(outsiderConv.status).toBe(200);
    expect(Array.isArray(outsiderConv.body.messages)).toBe(true);
    expect(outsiderConv.body.messages.length).toBe(0);

    const del = await request(app)
      .delete('/messages')
      .set('Authorization', receiverAuth)
      .query({ userId: sender.id, announcementId: announcement.id });
    expect(del.status).toBe(200);

    const convAfterDelete = await request(app)
      .get('/messages')
      .set('Authorization', receiverAuth)
      .query({ userId: sender.id, announcementId: announcement.id });
    expect(convAfterDelete.body.messages.length).toBe(0);
  });

  it('rejects missing token for protected routes', async () => {
    const res = await request(app).get('/messages/unread-count');
    expect(res.status).toBe(401);
  });
});
