import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as ratingService from '../services/rating.service.js';
import * as exchangeService from '../services/exchange.service.js';
import { emitExchangeRatingPrompt, emitExchangeViewUpdated, emitRatingSummary } from '../realtime/socket.js';

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

export const createRating = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const rating = await ratingService.createRating(userId, req.body);
    const summary = await ratingService.getRatingsSummary(rating.toUserId);
    emitRatingSummary({ userId: rating.toUserId, summary });

    const [view, prompt] = await Promise.all([
      exchangeService.getExchangeRealtimeForUser(userId, rating.exchangeId),
      exchangeService.getExchangeRatingPromptState(userId, rating.exchangeId),
    ]);
    if (view) {
      emitExchangeViewUpdated({ userId, exchange: view });
    }
    if (prompt) {
      emitExchangeRatingPrompt({
        userId,
        exchangeId: rating.exchangeId,
        shouldPrompt: prompt.shouldPrompt,
        ratingTarget: prompt.ratingTarget,
      });
    }

    res.status(201).json({ success: true, rating });
  } catch (error: any) {
    if (error?.message === 'Exchange not found') {
      res.status(404).json({ success: false, message: 'Exchange not found' });
      return;
    }
    if (error?.message === 'Exchange is not completed') {
      res.status(400).json({ success: false, message: 'Exchange is not completed' });
      return;
    }
    if (error?.message === 'Forbidden') {
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }
    if (error?.message === 'Invalid rating target') {
      res.status(400).json({ success: false, message: 'Invalid rating target' });
      return;
    }
    if (error?.message === 'Cannot rate yourself') {
      res.status(400).json({ success: false, message: 'Cannot rate yourself' });
      return;
    }
    if (error?.message === 'Rating already exists') {
      res.status(409).json({ success: false, message: 'Rating already exists' });
      return;
    }
    respondServerError(res, 'Failed to create rating', error);
  }
};

export const getRatingsSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params['id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User id is required' });
      return;
    }

    const summary = await ratingService.getRatingsSummary(userId);
    res.status(200).json({ success: true, summary });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch ratings summary', error);
  }
};
