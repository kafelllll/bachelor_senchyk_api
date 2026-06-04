import type { Request, Response } from 'express';
import * as authService from '../services/auth.service.js';
import type { AuthRequest } from '../middlewares/auth.middleware.js';

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user } = await authService.registerUser(req.body);
    res.status(201).json({
      success: true,
      message: 'Verification email sent',
      user
    });
  } catch (error: any) {
    if (error.message === 'User already exists') {
      res.status(409).json({ success: false, message: error.message });
      return;
    }
    if (error.message === 'SMTP configuration is incomplete') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
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
    if (error.message === 'Email not verified') {
      res.status(403).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  if (!token) {
    res.status(400).json({ success: false, message: 'Verification token is required' });
    return;
  }

  try {
    const { user, token: authToken } = await authService.verifyEmail(token);
    const frontendBase = process.env.FRONTEND_URL;
    if (frontendBase) {
      const redirectUrl = new URL(`${frontendBase}/verify-email`);
      redirectUrl.searchParams.set('token', token);
      res.redirect(302, redirectUrl.toString());
      return;
    }
    res.status(200).json({ success: true, message: 'Email verified', token: authToken, user });
  } catch (error: any) {
    if (error.message === 'Invalid verification token') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error.message === 'Verification token expired') {
      res.status(410).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const verifyEmailFromBody = async (req: Request, res: Response): Promise<void> => {
  const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
  const verificationValue = token || code;
  if (!verificationValue) {
    res.status(400).json({ success: false, message: 'Verification token is required' });
    return;
  }

  try {
    const { user, token: authToken } = await authService.verifyEmail(verificationValue);
    res.status(200).json({ success: true, message: 'Email verified', token: authToken, user });
  } catch (error: any) {
    if (error.message === 'Invalid verification token') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error.message === 'Verification token expired') {
      res.status(410).json({ success: false, message: error.message });
      return;
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const resendVerificationEmail = async (req: Request, res: Response): Promise<void> => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
  if (!email) {
    res.status(400).json({ success: false, message: 'Email is required' });
    return;
  }

  try {
    const result = await authService.resendVerificationEmail(email);
    if (result.status === 'already_verified') {
      res.status(200).json({ success: true, message: 'Email already verified' });
      return;
    }
    res.status(200).json({ success: true, message: 'Verification email sent' });
  } catch (error: any) {
    if (error.message === 'SMTP configuration is incomplete') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
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
    res.status(500).json({ success: false, message: 'Failed to fetch user' });
    return;
  }
};
