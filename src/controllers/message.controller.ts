import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as messageService from '../services/message.service.js';
import { emitMessageCreated, emitUnreadCount } from '../realtime/socket.js';

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

export const createMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const message = await messageService.createMessage(userId, req.body);
    emitMessageCreated(message);
    const receiverUnreadCount = await messageService.getUnreadCount(message.receiverId);
    emitUnreadCount(message.receiverId, receiverUnreadCount);

    res.status(201).json({ success: true, message });
  } catch (error: any) {
    if (error?.message === 'Receiver not found') {
      res.status(404).json({ success: false, message: 'Receiver not found' });
      return;
    }
    if (error?.message === 'Announcement not found') {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }
    if (error?.message === 'Cannot message yourself') {
      res.status(400).json({ success: false, message: 'Cannot message yourself' });
      return;
    }
    respondServerError(res, 'Failed to create message', error);
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const otherUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    if (!otherUserId) {
      res.status(400).json({ success: false, message: 'userId query is required' });
      return;
    }

    const announcementId = typeof req.query.announcementId === 'string'
      ? req.query.announcementId.trim()
      : undefined;

    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;

    const messages = await messageService.getMessagesBetweenUsers(userId, otherUserId, announcementId, limit);

    const unreadCount = await messageService.getUnreadCount(userId);
    emitUnreadCount(userId, unreadCount);
    res.status(200).json({ success: true, messages });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch messages', error);
  }
};

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const limitRaw = typeof req.query.limit === 'string' ? Number(req.query.limit) : undefined;
    const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
    const conversations = await messageService.getConversations(userId, { limit });
    res.status(200).json({ success: true, conversations });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch conversations', error);
  }
};

export const deleteConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const otherUserId = typeof req.query.userId === 'string' ? req.query.userId.trim() : '';
    if (!otherUserId) {
      res.status(400).json({ success: false, message: 'userId query is required' });
      return;
    }

    const announcementId = typeof req.query.announcementId === 'string'
      ? req.query.announcementId.trim()
      : undefined;

    const result = await messageService.deleteConversation(userId, {
      userId: otherUserId,
      announcementId: announcementId ?? null,
    });

    const unreadCount = await messageService.getUnreadCount(userId);
    emitUnreadCount(userId, unreadCount);
    res.status(200).json({ success: true, deletedCount: result.count });
  } catch (error: any) {
    respondServerError(res, 'Failed to delete conversation', error);
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const unreadCount = await messageService.getUnreadCount(userId);
    res.status(200).json({ success: true, unreadCount });
  } catch (error: any) {
    respondServerError(res, 'Failed to fetch unread count', error);
  }
};
