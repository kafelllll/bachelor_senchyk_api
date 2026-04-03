import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as announcementService from '../services/announcement.service.js';
import * as announcementMatchingService from '../services/announcementMatching.service.js';

const respondUnauthorized = (res: Response): null => {
  res.status(401).json({ success: false, message: 'Unauthorized' });
  return null;
};

const getUserIdOrUnauthorized = (req: AuthRequest, res: Response): string | null => {
  const userId = req.user?.id;
  return userId ? userId : respondUnauthorized(res);
};

const getAnnouncementIdOrBadRequest = (req: AuthRequest, res: Response): string | null => {
  const paramId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const queryIdRaw = req.query?.announcementId ?? req.query?.id;
  const queryId = typeof queryIdRaw === 'string' ? queryIdRaw.trim() : '';
  const announcementId = paramId || queryId;
  if (!announcementId) {
    res.status(400).json({ success: false, message: 'Announcement id is required' });
    return null;
  }
  return announcementId;
};

const respondServerError = (res: Response, message: string, error: any): void => {
  res.status(500).json({
    success: false,
    message,
    error: error?.message ?? 'Unknown error',
  });
};

export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const announcements = await announcementService.getAnnouncementsForFeed(userId);
    res.status(200).json({ success: true, announcements });
  } catch (error: any) {
    console.error('Get announcements error:', error?.message);
    respondServerError(res, 'Failed to fetch announcements', error);
  }
};

export const getMyAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const announcements = await announcementService.getAnnouncementsForUser(userId);
    res.status(200).json({ success: true, announcements });
  } catch (error: any) {
    console.error('Get my announcements error:', error?.message);
    respondServerError(res, 'Failed to fetch your announcements', error);
  }
};

export const getAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const announcementId = getAnnouncementIdOrBadRequest(req, res);
    if (!announcementId) return;

    // ✅ ЗМІНЕНО: Отримуємо оглошення БЕЗ перевірки userId (публічний доступ)
    // Будь-який залогінений користувач може видіти будь-яке оглошення
    const announcement = await announcementService.getAnnouncementByIdPublic(announcementId);
    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.status(200).json({ success: true, announcement });
  } catch (error: any) {
    console.error('Get announcement error:', error?.message);
    respondServerError(res, 'Failed to fetch announcement', error);
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    // Перевіримо кількість активних оглошень
    const activeCount = await announcementService.countActiveAnnouncements(userId);
    const MAX_ACTIVE_ANNOUNCEMENTS = 50;
    
    if (activeCount >= MAX_ACTIVE_ANNOUNCEMENTS) {
      res.status(400).json({ 
        success: false, 
        message: `You have reached the maximum number of active announcements (${MAX_ACTIVE_ANNOUNCEMENTS}). Please delete some announcements before creating new ones.`,
        activeCount,
      });
      return;
    }

    const announcement = await announcementService.createAnnouncement(userId, req.body);
    res.status(201).json({ success: true, announcement });
  } catch (error: any) {
    console.error('Create announcement error:', error?.message);
    respondServerError(res, 'Failed to create announcement', error);
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const rawId =
      req.params.id ||
      (typeof req.body?.id === 'string' ? req.body.id : '') ||
      (typeof req.body?.announcementId === 'string' ? req.body.announcementId : '');
    const announcementId = rawId.trim();
    if (!announcementId) {
      res.status(400).json({ success: false, message: 'Announcement id is required' });
      return;
    }

    // ✅ FIX: Check ownership with proper error codes (public fetch to distinguish 404 vs 403)
    const announcement = await announcementService.getAnnouncementByIdPublic(announcementId);
    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }
    
    // Check if user owns it
    if (announcement.userId !== userId) {
      res.status(403).json({ success: false, message: 'You do not have permission to delete this announcement' });
      return;
    }

    const removed = await announcementService.deleteAnnouncement(userId, announcementId);
    if (!removed) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Delete announcement error:', error?.message);
    respondServerError(res, 'Failed to delete announcement', error);
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const announcementId = getAnnouncementIdOrBadRequest(req, res);
    if (!announcementId) return;

    // ✅ FIX: Check ownership with proper error codes (public fetch to distinguish 404 vs 403)
    const announcement = await announcementService.getAnnouncementByIdPublic(announcementId);
    if (!announcement) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }
    
    // Check if user owns it
    if (announcement.userId !== userId) {
      res.status(403).json({ success: false, message: 'You do not have permission to update this announcement' });
      return;
    }

    const updated = await announcementService.updateAnnouncement(userId, announcementId, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    // ✅ FIX: Return updated announcement data
    const updatedAnnouncement = await announcementService.getAnnouncementByIdPublic(announcementId);
    res.status(200).json({ success: true, announcement: updatedAnnouncement });
  } catch (error: any) {
    console.error('Update announcement error:', error?.message);
    respondServerError(res, 'Failed to update announcement', error);
  }
};

export const getAnnouncementMatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const announcementId = getAnnouncementIdOrBadRequest(req, res);
    if (!announcementId) return;

    const matches = await announcementMatchingService.getAnnouncementMatches(userId, announcementId);
    if (matches === null) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.status(200).json({ success: true, matches });
  } catch (error: any) {
    console.error('Get announcement matches error:', error?.message);
    respondServerError(res, 'Failed to fetch announcement matches', error);
  }
};

export const getUserAnnouncementMatches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const matches = await announcementMatchingService.getUserAnnouncementMatches(userId);
    res.status(200).json({ success: true, matches });
  } catch (error: any) {
    console.error('Get user announcement matches error:', error?.message);
    respondServerError(res, 'Failed to fetch recommendations', error);
  }
};
