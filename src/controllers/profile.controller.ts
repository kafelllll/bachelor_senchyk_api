import type { Request, Response } from 'express';
import type { AuthRequest } from '../middlewares/auth.middleware.js';
import * as profileService from '../services/profile.service.js';

const getUserIdOrUnauthorized = (req: AuthRequest, res: Response): string | null => {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return null;
  }
  return userId;
};

const respondServerError = (res: Response, message: string, error: any): void => {
  res.status(500).json({
    success: false,
    message,
    error: error?.message ?? 'Unknown error',
  });
};

export const getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const profile = await profileService.getMyProfile(userId);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    if (error?.message === 'User not found') {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    respondServerError(res, 'Failed to fetch profile', error);
  }
};

export const getUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = typeof req.params.id === 'string' ? req.params.id.trim() : '';
    if (!id) {
      res.status(400).json({ success: false, message: 'User ID is required' });
      return;
    }

    const profile = await profileService.getUserProfile(id);
    res.status(200).json({ success: true, profile, user: profile });
  } catch (error: any) {
    if (error?.message === 'User not found') {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    respondServerError(res, 'Failed to fetch profile', error);
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    const profile = await profileService.updateMyProfile(userId, req.body);
    res.status(200).json({ success: true, profile });
  } catch (error: any) {
    respondServerError(res, 'Failed to update profile', error);
  }
};

export const deleteMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = getUserIdOrUnauthorized(req, res);
    if (!userId) return;

    await profileService.deleteMyAccount(userId);
    res.status(200).json({ success: true });
  } catch (error: any) {
    respondServerError(res, 'Failed to delete account', error);
  }
};
