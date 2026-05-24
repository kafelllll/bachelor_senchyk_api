import express from 'express';
import cors from 'cors';

export const createTestApp = async () => {
  const [{ default: authRoutes }, { default: userRoutes }, { default: announcementRoutes }, { default: plantRoutes }, { default: uploadRoutes }, { default: profileRoutes }, { default: messageRoutes }, { default: exchangeRoutes }, { default: ratingRoutes }, { normalizeRequestStrings }, { errorHandler }] = await Promise.all([
    import('../../src/routes/auth.routes.js'),
    import('../../src/routes/user.routes.js'),
    import('../../src/routes/announcement.routes.js'),
    import('../../src/routes/plant.routes.js'),
    import('../../src/routes/uploadRoutes.js'),
    import('../../src/routes/profile.routes.js'),
    import('../../src/routes/message.routes.js'),
    import('../../src/routes/exchange.routes.js'),
    import('../../src/routes/rating.routes.js'),
    import('../../src/middlewares/normalize.middleware.js'),
    import('../../src/middlewares/error.middleware.js'),
  ]);

  const app = express();

  app.use(cors());
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

  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  app.use(errorHandler);

  return app;
};
