import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as announcementService from '../services/announcement.service.js';

export const getAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const announcements = await announcementService.getAnnouncementsForFeed(userId);
    res.status(200).json({ success: true, announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getMyAnnouncements = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const announcements = await announcementService.getAnnouncementsForUser(userId);
    res.status(200).json({ success: true, announcements });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const announcement = await announcementService.createAnnouncement(userId, req.body);
    res.status(201).json({ success: true, announcement });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const rawId =
      req.params.id ||
      (typeof req.body?.id === 'string' ? req.body.id : '') ||
      (typeof req.body?.announcementId === 'string' ? req.body.announcementId : '');
    const announcementId = rawId.trim();
    if (!announcementId) {
      res.status(400).json({ success: false, message: 'Announcement id is required' });
      return;
    }

    const removed = await announcementService.deleteAnnouncement(userId, announcementId);
    if (!removed) {
      res.status(404).json({ success: false, message: 'Announcement not found' });
      return;
    }

    res.status(200).json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
