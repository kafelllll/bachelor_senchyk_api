import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as exchangeService from '../services/exchange.service.js';
import * as ratingService from '../services/rating.service.js';
import {
  emitExchangeCounts,
  emitExchangeRatingPrompt,
  emitExchangeUpdated,
  emitExchangeViewUpdated,
  emitRatingSummary,
} from '../realtime/socket.js';

const respondUnauthorized = (res: Response): null => {
  res.status(401).json({ success: false, message: 'Unauthorized' });
  return null;
};

const getUserIdOrUnauthorized = (req: AuthRequest, res: Response): string | null => {
  const userId = req.user?.id;
  return userId ? userId : respondUnauthorized(res);
};

const respondServerError = (res: Response, message: string, error: any): void => {
  res.status(500).json({
    success: false,
    message,
    error: error?.message ?? 'Unknown error',
  });
};

const emitExchangeRealtimeState = async (exchange: {
  id: string;
  initiatorId: string;
  receiverId: string;
}) => {
  const userIds = Array.from(new Set([exchange.initiatorId, exchange.receiverId]));

  await Promise.all(
    userIds.map(async (userId) => {
      const [view, ratingPrompt] = await Promise.all([
        exchangeService.getExchangeRealtimeForUser(userId, exchange.id),
        exchangeService.getExchangeRatingPromptState(userId, exchange.id),
      ]);

      if (view) {
        emitExchangeViewUpdated({ userId, exchange: view });
      }

      if (ratingPrompt) {
        emitExchangeRatingPrompt({
          userId,
          exchangeId: exchange.id,
          shouldPrompt: ratingPrompt.shouldPrompt,
          ratingTarget: ratingPrompt.ratingTarget,
        });
      }
    }),
  );
};

export const createExchange = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const exchange = await exchangeService.createExchange(userId, req.body);
    emitExchangeUpdated({ userIds: [exchange.initiatorId, exchange.receiverId], exchange });
    await emitExchangeRealtimeState(exchange);

    const [initiatorPending, receiverPending] = await Promise.all([
      exchangeService.getPendingExchangeCount(exchange.initiatorId),
      exchangeService.getPendingExchangeCount(exchange.receiverId),
    ]);
    emitExchangeCounts({ userId: exchange.initiatorId, pendingCount: initiatorPending });
    emitExchangeCounts({ userId: exchange.receiverId, pendingCount: receiverPending });

    res.status(201).json({ success: true, exchange });
  } catch (error: any) {
    if (error?.message === 'Announcement not found') {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }
    if (error?.message === 'Offered announcement not found') {
      res.status(404).json({ success: false, message: 'Offered announcement not found' });
      return;
    }
    if (error?.message === 'No suitable offered announcement found') {
      res.status(400).json({
        success: false,
        message: 'Не знайдено активного оголошення для авто-підбору обміну',
      });
      return;
    }
    if (error?.message === 'Cannot create exchange for your own announcement') {
      res.status(400).json({ success: false, message: 'Cannot create exchange for your own announcement' });
      return;
    }
    if (error?.message === 'Receiver does not match announcement owner') {
      res.status(400).json({ success: false, message: 'Receiver does not match announcement owner' });
      return;
    }
    if (error?.message === 'Exchange already exists') {
      res.status(409).json({ success: false, message: 'Exchange already exists' });
      return;
    }
    respondServerError(res, 'Failed to create exchange', error);
  }
};

export const updateExchangeStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const exchangeId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!exchangeId) {
      res.status(400).json({ success: false, message: 'Exchange id is required' });
      return;
    }

    const exchange = await exchangeService.updateExchangeStatus(userId, exchangeId, req.body);
    emitExchangeUpdated({ userIds: [exchange.initiatorId, exchange.receiverId], exchange });
    await emitExchangeRealtimeState(exchange);
    const [initiatorPending, receiverPending] = await Promise.all([
      exchangeService.getPendingExchangeCount(exchange.initiatorId),
      exchangeService.getPendingExchangeCount(exchange.receiverId),
    ]);
    emitExchangeCounts({ userId: exchange.initiatorId, pendingCount: initiatorPending });
    emitExchangeCounts({ userId: exchange.receiverId, pendingCount: receiverPending });

    if (exchange.status === 'completed') {
      const initiatorSummary = await ratingService.getRatingsSummary(exchange.initiatorId);
      const receiverSummary = await ratingService.getRatingsSummary(exchange.receiverId);
      emitRatingSummary({ userId: exchange.initiatorId, summary: initiatorSummary });
      emitRatingSummary({ userId: exchange.receiverId, summary: receiverSummary });
    }
    res.status(200).json({ success: true, exchange });
  } catch (error: any) {
    if (error?.message === 'Exchange not found') {
      res.status(404).json({ success: false, message: 'Exchange not found' });
      return;
    }
    if (error?.message === 'Forbidden') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (error?.message === 'Only receiver can accept exchange') {
      res.status(403).json({ success: false, message: 'Only receiver can accept exchange' });
      return;
    }
    if (error?.message === 'Invalid status transition') {
      res.status(400).json({ success: false, message: 'Invalid status transition' });
      return;
    }
    if (error?.message === 'Use confirm completion endpoint') {
      res.status(400).json({ success: false, message: 'Use /exchanges/:id/confirm-completion' });
      return;
    }
    respondServerError(res, 'Failed to update exchange', error);
  }
};

export const confirmExchangeCompletion = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const exchangeId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!exchangeId) {
      res.status(400).json({ success: false, message: 'Exchange id is required' });
      return;
    }

    const exchange = await exchangeService.confirmExchangeCompletion(userId, exchangeId);
    emitExchangeUpdated({ userIds: [exchange.initiatorId, exchange.receiverId], exchange });
    await emitExchangeRealtimeState(exchange);

    const [initiatorPending, receiverPending] = await Promise.all([
      exchangeService.getPendingExchangeCount(exchange.initiatorId),
      exchangeService.getPendingExchangeCount(exchange.receiverId),
    ]);
    emitExchangeCounts({ userId: exchange.initiatorId, pendingCount: initiatorPending });
    emitExchangeCounts({ userId: exchange.receiverId, pendingCount: receiverPending });

    if (exchange.status === 'completed') {
      const initiatorSummary = await ratingService.getRatingsSummary(exchange.initiatorId);
      const receiverSummary = await ratingService.getRatingsSummary(exchange.receiverId);
      emitRatingSummary({ userId: exchange.initiatorId, summary: initiatorSummary });
      emitRatingSummary({ userId: exchange.receiverId, summary: receiverSummary });
    }

    res.status(200).json({ success: true, exchange });
  } catch (error: any) {
    if (error?.message === 'Exchange not found') {
      res.status(404).json({ success: false, message: 'Exchange not found' });
      return;
    }
    if (error?.message === 'Forbidden') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (error?.message === 'Exchange already completed') {
      res.status(409).json({ success: false, message: 'Exchange already completed' });
      return;
    }
    if (error?.message === 'Completion already confirmed by this user') {
      res.status(409).json({ success: false, message: 'Completion already confirmed by this user' });
      return;
    }
    if (error?.message === 'Exchange must be accepted before completion confirmation') {
      res.status(400).json({ success: false, message: 'Exchange must be accepted before completion confirmation' });
      return;
    }
    if (error?.message === 'Seeker must confirm completion first') {
      res.status(400).json({ success: false, message: 'Seeker must confirm completion first' });
      return;
    }
    respondServerError(res, 'Failed to confirm exchange completion', error);
  }
};

export const getMyExchanges = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const exchanges = await exchangeService.getMyExchanges(userId);
    res.status(200).json({ success: true, exchanges });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch exchanges', error);
  }
};

export const getExchangeHistory = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const history = await exchangeService.getExchangeHistory(userId);
    res.status(200).json({ success: true, history });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch exchange history', error);
  }
};

export const getPendingExchangeCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const pendingCount = await exchangeService.getPendingExchangeCount(userId);
    res.status(200).json({ success: true, pendingCount });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch pending exchanges count', error);
  }
};

