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

describe('Exchanges API integration', () => {
  it('creates exchange and rejects duplicate', async () => {
    const initiator = await createUser({ email: 'ex-init@test.local' });
    const receiver = await createUser({ email: 'ex-rec@test.local' });

    const requested = await createAnnouncement(receiver.id, {
      plantName: 'Requested plant',
      offerType: 'offer',
      category: 'indoor',
    });

    const offered = await createAnnouncement(initiator.id, {
      plantName: 'Offered plant',
      offerType: 'looking-for',
      category: 'indoor',
    });

    const initAuth = await authHeaderForUser(initiator);

    const createRes = await request(app)
      .post('/exchanges')
      .set('Authorization', initAuth)
      .send({ announcementId: requested.id, offeredAnnouncementId: offered.id });

    expect(createRes.status).toBe(201);

    const duplicateRes = await request(app)
      .post('/exchanges')
      .set('Authorization', initAuth)
      .send({ announcementId: requested.id, offeredAnnouncementId: offered.id });

    expect(duplicateRes.status).toBe(409);
  });

  it('enforces accept/completion flow, access control, history and pending count', async () => {
    const initiator = await createUser({ email: 'ex-flow-init@test.local' });
    const receiver = await createUser({ email: 'ex-flow-rec@test.local' });
    const outsider = await createUser({ email: 'ex-flow-out@test.local' });

    const requested = await createAnnouncement(receiver.id, {
      plantName: 'Requested flow',
      offerType: 'offer',
      category: 'indoor',
    });

    const offered = await createAnnouncement(initiator.id, {
      plantName: 'Offered flow',
      offerType: 'looking-for',
      category: 'indoor',
    });

    const initAuth = await authHeaderForUser(initiator);
    const recvAuth = await authHeaderForUser(receiver);
    const outAuth = await authHeaderForUser(outsider);

    const createRes = await request(app)
      .post('/exchanges')
      .set('Authorization', initAuth)
      .send({ announcementId: requested.id, offeredAnnouncementId: offered.id });

    const exchangeId = createRes.body.exchange.id;

    const pendingRes = await request(app)
      .get('/exchanges/pending-count')
      .set('Authorization', recvAuth);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.pendingCount).toBeGreaterThanOrEqual(1);

    const outsiderStatus = await request(app)
      .patch(`/exchanges/${exchangeId}/status`)
      .set('Authorization', outAuth)
      .send({ status: 'accepted' });
    expect(outsiderStatus.status).toBe(403);

    const initiatorAccept = await request(app)
      .patch(`/exchanges/${exchangeId}/status`)
      .set('Authorization', initAuth)
      .send({ status: 'accepted' });
    expect(initiatorAccept.status).toBe(403);

    const receiverAccept = await request(app)
      .patch(`/exchanges/${exchangeId}/status`)
      .set('Authorization', recvAuth)
      .send({ status: 'accepted' });
    expect(receiverAccept.status).toBe(200);

    const giverFirst = await request(app)
      .post(`/exchanges/${exchangeId}/confirm-completion`)
      .set('Authorization', recvAuth)
      .send({});
    expect(giverFirst.status).toBe(400);

    const seekerConfirm = await request(app)
      .post(`/exchanges/${exchangeId}/confirm-completion`)
      .set('Authorization', initAuth)
      .send({});
    expect(seekerConfirm.status).toBe(200);

    const giverConfirm = await request(app)
      .post(`/exchanges/${exchangeId}/confirm-completion`)
      .set('Authorization', recvAuth)
      .send({});
    expect(giverConfirm.status).toBe(200);
    expect(giverConfirm.body.exchange.status).toBe('completed');

    const completedExchange = await prisma.exchange.findUnique({ where: { id: exchangeId } });
    expect(completedExchange.status).toBe('completed');

    const myExchanges = await request(app)
      .get('/exchanges/my')
      .set('Authorization', initAuth);
    expect(myExchanges.status).toBe(200);
    expect(myExchanges.body.exchanges.some((ex) => ex.id === exchangeId)).toBe(true);

    const history = await request(app)
      .get('/exchanges/history')
      .set('Authorization', initAuth);
    expect(history.status).toBe(200);
    expect(Array.isArray(history.body.history.completed)).toBe(true);
    expect(history.body.history.completed.some((ex) => ex.id === exchangeId)).toBe(true);
  });

  it('supports cancel flow for participants', async () => {
    const initiator = await createUser({ email: 'ex-cancel-init@test.local' });
    const receiver = await createUser({ email: 'ex-cancel-rec@test.local' });

    const requested = await createAnnouncement(receiver.id, {
      plantName: 'Requested cancel',
      offerType: 'offer',
      category: 'indoor',
    });
    const offered = await createAnnouncement(initiator.id, {
      plantName: 'Offered cancel',
      offerType: 'looking-for',
      category: 'indoor',
    });

    const initAuth = await authHeaderForUser(initiator);
    const createRes = await request(app)
      .post('/exchanges')
      .set('Authorization', initAuth)
      .send({ announcementId: requested.id, offeredAnnouncementId: offered.id });

    const exchangeId = createRes.body.exchange.id;

    const cancelRes = await request(app)
      .patch(`/exchanges/${exchangeId}/status`)
      .set('Authorization', initAuth)
      .send({ status: 'cancelled' });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.exchange.status).toBe('cancelled');
  });

  it('returns my exchanges ordered by exchange createdAt descending', async () => {
    const initiator = await createUser({ email: 'ex-order-init@test.local' });
    const receiver = await createUser({ email: 'ex-order-rec@test.local' });

    const oldAnnouncement = await createAnnouncement(receiver.id, {
      plantName: 'Old exchange source',
      offerType: 'offer',
      category: 'indoor',
    });
    const newAnnouncement = await createAnnouncement(receiver.id, {
      plantName: 'New exchange source',
      offerType: 'offer',
      category: 'indoor',
    });

    const offered = await createAnnouncement(initiator.id, {
      plantName: 'Offered order plant',
      offerType: 'looking-for',
      category: 'indoor',
    });

    await prisma.exchange.create({
      data: {
        initiatorId: initiator.id,
        receiverId: receiver.id,
        announcementId: oldAnnouncement.id,
        offeredAnnouncementId: offered.id,
        status: 'pending',
        createdAt: new Date('2026-04-05T10:00:00.000Z'),
        updatedAt: new Date('2026-04-05T10:00:00.000Z'),
      },
    });

    await prisma.exchange.create({
      data: {
        initiatorId: initiator.id,
        receiverId: receiver.id,
        announcementId: newAnnouncement.id,
        offeredAnnouncementId: offered.id,
        status: 'pending',
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        updatedAt: new Date('2026-05-24T10:00:00.000Z'),
      },
    });

    const initAuth = await authHeaderForUser(initiator);
    const myExchanges = await request(app)
      .get('/exchanges/my')
      .set('Authorization', initAuth);

    expect(myExchanges.status).toBe(200);
    expect(myExchanges.body.exchanges[0].createdAt).toBe('2026-05-24T10:00:00.000Z');
    expect(myExchanges.body.exchanges[1].createdAt).toBe('2026-04-05T10:00:00.000Z');
  });
});
