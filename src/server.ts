import 'dotenv/config';
import { createServer } from 'node:http';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import plantRoutes from './routes/plant.routes.js';
import uploadRoutes from './routes/uploadRoutes.cjs';
import profileRoutes from './routes/profile.routes.js';
import messageRoutes from './routes/message.routes.js';
import exchangeRoutes from './routes/exchange.routes.js';
import ratingRoutes from './routes/rating.routes.js';
import { normalizeRequestStrings } from './middlewares/normalize.middleware.js';
import { initSocketServer } from './realtime/socket.js';

const app = express();
const PORT = 3000;

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

app.get('/', (req, res) => {
  res.send('Працює на TypeScript!');
});

const server = createServer(app);
initSocketServer(server);

server.listen(PORT, () => {
  console.log(`Server: http://localhost:${PORT}`);
});