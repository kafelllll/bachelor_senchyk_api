import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params['id'] as string;
    if (!userId) {
      res.status(400).json({ message: 'User ID is required' });
      return;
    }
    const user = await authService.getUserById(userId);
    res.status(200).json({ user });
  } catch (error: any) {
    if (error.message === 'User not found') {
      res.status(404).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: 'Internal server error' });
  }
};
