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
    console.error('Get announcements error:', error?.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch announcements',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
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
    console.error('Get my announcements error:', error?.message);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch your announcements',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
  }
};

export const getAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const announcementId = typeof req.params.id === 'string' ? req.params.id : '';
    if (!announcementId) {
      res.status(400).json({ success: false, message: 'Announcement id is required' });
      return;
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch announcement',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
  }
};

export const createAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create announcement',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete announcement',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
  }
};

export const updateAnnouncement = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const announcementId = typeof req.params.id === 'string' ? req.params.id : '';
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
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update announcement',
      ...(process.env.NODE_ENV === 'development' && { error: error?.message })
    });
  }
};
