import type { Request, Response } from 'express';
import * as profileService from '../services/profile.service.js';

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['id'] as string;
    if (!userId) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }
    const user = await profileService.getUserProfile(userId);
    res.status(200).json({ success: true, user, profile: user });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
