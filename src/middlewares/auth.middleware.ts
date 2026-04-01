import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.js';
import * as tokenRepository from '../repositories/token.repository.js';

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

// Extending express Request to include user
export interface AuthRequest extends Request {
  user?: JwtPayload;
  token?: string;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    res.status(401).json({ message: 'Authentication required' });
    return;
  }

  try {
    // Check if token exists in DB (hasn't been logged out)
    const tokenInDb = await tokenRepository.findToken(token, 'auth');
    if (!tokenInDb) {
      res.status(401).json({ message: 'Token is invalid or user logged out' });
      return;
    }

    const decoded = verifyToken(token) as JwtPayload;
    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
};
