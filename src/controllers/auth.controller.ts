import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, token } = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, token } = await authService.loginUser(req.body);
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user
    });
  } catch (error: any) {
    if (error.message === 'Invalid credentials') {
      res.status(401).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const logout = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.token) {
      await authService.logoutUser(req.token);
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Error during logout' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }
    const user = await authService.getUserById(userId);
    res.status(200).json({ success: true, user });
  } catch (error: any) {
    res.status(404).json({ success: false, message: error.message });
  }
};
