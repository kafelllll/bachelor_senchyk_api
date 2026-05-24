import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import type { JwtPayload } from '../middlewares/auth.middleware.js';
import { verifyToken } from '../utils/jwt.js';
import * as tokenRepository from '../repositories/token.repository.js';

let io: Server | null = null;

const normalizeOrigins = () => {
  const raw = process.env.FRONTEND_URL;
  if (!raw) {
    return '*';
  }
  const list = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return list.length > 0 ? list : '*';
};

const extractToken = (authHeader?: string, authToken?: string) => {
  if (authToken && authToken.trim().length > 0) {
    return authToken.trim();
  }
  if (!authHeader) {
    return '';
  }
  const [type, value] = authHeader.split(' ');
  if (type?.toLowerCase() === 'bearer' && value) {
    return value.trim();
  }
  return '';
};

export const initSocketServer = (httpServer: HttpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: normalizeOrigins(),
    },
  });

  io.use(async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const authHeader = Array.isArray(socket.handshake.headers.authorization)
        ? socket.handshake.headers.authorization[0]
        : socket.handshake.headers.authorization;
      const token = extractToken(authHeader, socket.handshake.auth?.token);
      if (!token) {
        return next(new Error('Unauthorized'));
      }
      const tokenInDb = await tokenRepository.findToken(token, 'auth');
      if (!tokenInDb) {
        return next(new Error('Unauthorized'));
      }
      const decoded = verifyToken(token) as JwtPayload;
      if (!decoded || typeof decoded === 'string' || !decoded.id) {
        return next(new Error('Unauthorized'));
      }
      socket.data.userId = decoded.id;
      return next();
    } catch (error) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;
    if (!userId) {
      socket.disconnect();
      return;
    }
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      socket.leave(`user:${userId}`);
    });
  });

  return io;
};

export const emitMessageCreated = (message: {
  senderId: string;
  receiverId: string;
}) => {
  if (!io) {
    return;
  }
  io.to(`user:${message.senderId}`).to(`user:${message.receiverId}`).emit('message:new', message);
};

export const emitUnreadCount = (userId: string, unreadCount: number) => {
  if (!io) {
    return;
  }
  io.to(`user:${userId}`).emit('message:unread-count', { unreadCount });
};

export const emitExchangeUpdated = (params: {
  userIds: string[];
  exchange: unknown;
}) => {
  if (!io) {
    return;
  }
  const server = io;
  params.userIds.forEach((userId) => {
    server.to(`user:${userId}`).emit('exchange:updated', params.exchange);
  });
};

export const emitExchangeViewUpdated = (params: {
  userId: string;
  exchange: unknown;
}) => {
  if (!io) {
    return;
  }
  io.to(`user:${params.userId}`).emit('exchange:view-updated', params.exchange);
};

export const emitExchangeCounts = (params: {
  userId: string;
  pendingCount: number;
}) => {
  if (!io) {
    return;
  }
  const server = io;
  server.to(`user:${params.userId}`).emit('exchange:counts', {
    pendingCount: params.pendingCount,
  });
};

export const emitExchangeRatingPrompt = (params: {
  userId: string;
  exchangeId: string;
  shouldPrompt: boolean;
  ratingTarget: unknown | null;
}) => {
  if (!io) {
    return;
  }
  io.to(`user:${params.userId}`).emit('exchange:rating-prompt', {
    exchangeId: params.exchangeId,
    shouldPrompt: params.shouldPrompt,
    ratingTarget: params.ratingTarget,
  });
};

export const emitRatingSummary = (params: {
  userId: string;
  summary: unknown;
}) => {
  if (!io) {
    return;
  }
  const server = io;
  server.to(`user:${params.userId}`).emit('rating:summary', {
    userId: params.userId,
    summary: params.summary,
  });
};
