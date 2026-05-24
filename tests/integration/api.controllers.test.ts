import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const exchangeServiceMock = {
  createExchange: jest.fn(),
  updateExchangeStatus: jest.fn(),
  confirmExchangeCompletion: jest.fn(),
  getMyExchanges: jest.fn(),
  getExchangeHistory: jest.fn(),
  getPendingExchangeCount: jest.fn(),
  getExchangeRealtimeForUser: jest.fn(),
  getExchangeRatingPromptState: jest.fn(),
};

const ratingServiceMock = {
  createRating: jest.fn(),
  getRatingsSummary: jest.fn(),
};

const socketMock = {
  emitExchangeCounts: jest.fn(),
  emitExchangeRatingPrompt: jest.fn(),
  emitExchangeUpdated: jest.fn(),
  emitExchangeViewUpdated: jest.fn(),
  emitRatingSummary: jest.fn(),
};

jest.unstable_mockModule('../../src/middlewares/auth.middleware.js', () => ({
  authenticate: (req, _res, next) => {
    req.user = {
      id: req.header('x-test-user-id') ?? 'test-user',
      email: 'test@example.com',
    };
    next();
  },
  optionalAuthenticate: (_req, _res, next) => next(),
}));

jest.unstable_mockModule('../../src/services/exchange.service.js', () => exchangeServiceMock);
jest.unstable_mockModule('../../src/services/rating.service.js', () => ratingServiceMock);
jest.unstable_mockModule('../../src/realtime/socket.js', () => socketMock);

const { default: exchangeRoutes } = await import('../../src/routes/exchange.routes.js');
const { default: ratingRoutes } = await import('../../src/routes/rating.routes.js');

const app = express();
app.use(express.json());
app.use('/exchanges', exchangeRoutes);
app.use('/ratings', ratingRoutes);

describe('API integration (route + middleware + controller)', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    exchangeServiceMock.getPendingExchangeCount.mockResolvedValue(0);
    exchangeServiceMock.getExchangeRealtimeForUser.mockResolvedValue(null);
    exchangeServiceMock.getExchangeRatingPromptState.mockResolvedValue(null);
    ratingServiceMock.getRatingsSummary.mockResolvedValue({ averageRating: 5, ratingsCount: 1, completedExchangesCount: 1, latestReviews: [] });
  });

  it('POST /exchanges creates exchange', async () => {
    exchangeServiceMock.createExchange.mockResolvedValue({
      id: 'ex-1',
      initiatorId: 'user-a',
      receiverId: 'user-b',
      status: 'pending',
    });

    const res = await request(app)
      .post('/exchanges')
      .set('x-test-user-id', 'user-a')
      .send({
        announcementId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(exchangeServiceMock.createExchange).toHaveBeenCalledWith('user-a', {
      announcementId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
    });
  });

  it('PATCH /exchanges/:id/status returns 400 for complete-through-status flow', async () => {
    exchangeServiceMock.updateExchangeStatus.mockRejectedValue(new Error('Use confirm completion endpoint'));

    const res = await request(app)
      .patch('/exchanges/d290f1ee-6c54-4b01-90e6-d701748f0851/status')
      .set('x-test-user-id', 'user-a')
      .send({ status: 'completed' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('/exchanges/:id/confirm-completion');
  });

  it('POST /exchanges/:id/confirm-completion confirms completion', async () => {
    exchangeServiceMock.confirmExchangeCompletion.mockResolvedValue({
      id: 'ex-1',
      initiatorId: 'user-a',
      receiverId: 'user-b',
      status: 'completed',
    });

    const res = await request(app)
      .post('/exchanges/d290f1ee-6c54-4b01-90e6-d701748f0851/confirm-completion')
      .set('x-test-user-id', 'user-a')
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(exchangeServiceMock.confirmExchangeCompletion).toHaveBeenCalledWith(
      'user-a',
      'd290f1ee-6c54-4b01-90e6-d701748f0851',
    );
  });

  it('POST /ratings creates rating', async () => {
    ratingServiceMock.createRating.mockResolvedValue({
      id: 'r-1',
      exchangeId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
      toUserId: 'user-b',
      score: 5,
      comment: 'Great',
    });

    const res = await request(app)
      .post('/ratings')
      .set('x-test-user-id', 'user-a')
      .send({
        exchangeId: 'd290f1ee-6c54-4b01-90e6-d701748f0851',
        toUserId: 'd290f1ee-6c54-4b01-90e6-d701748f0852',
        score: 5,
        comment: 'Great',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(ratingServiceMock.createRating).toHaveBeenCalledWith('user-a', expect.objectContaining({ score: 5 }));
  });
});
