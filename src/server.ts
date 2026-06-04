import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import plantRoutes from './routes/plant.routes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import profileRoutes from './routes/profile.routes.js';
import messageRoutes from './routes/message.routes.js';
import exchangeRoutes from './routes/exchange.routes.js';
import ratingRoutes from './routes/rating.routes.js';
import { normalizeRequestStrings } from './middlewares/normalize.middleware.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { logger } from './utils/logger.js';
import { initSocketServer } from './realtime/socket.js';

const app = express();
const PORT = Number.parseInt(process.env.PORT || '3000', 10);

const resolveAllowedOrigins = () => {
  return [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_BASE_URL,
    process.env.BACKEND_URL,
  ]
    .map((value) => value?.trim().replace(/\/$/, ''))
    .filter((value): value is string => Boolean(value));
};

const allowedOrigins = resolveAllowedOrigins();
const corsOriginHandler: cors.CorsOptions['origin'] = (origin, callback) => {
  if (!origin) {
    callback(null, true);
    return;
  }

  const normalizedOrigin = origin.replace(/\/$/, '');
  if (allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
    callback(null, true);
    return;
  }

  callback(new Error('CORS origin is not allowed'));
};

app.use(cors({ origin: corsOriginHandler, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(normalizeRequestStrings);

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/announcements', announcementRoutes);
app.use('/plants', plantRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/profile', profileRoutes);
app.use('/messages', messageRoutes);
app.use('/exchanges', exchangeRoutes);
app.use('/ratings', ratingRoutes);

app.get('/', (req, res) => {
  res.send('Works on TypeScript!');
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use(errorHandler);

const server = createServer(app);
initSocketServer(server, allowedOrigins);

server.listen(PORT, () => {
  logger.info('Server started', {
    port: PORT,
    backendUrl: process.env.BACKEND_URL || null,
    allowedOrigins,
  });
});
