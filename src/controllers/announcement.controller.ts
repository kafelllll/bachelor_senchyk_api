import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as announcementService from '../services/announcement.service.js';

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
