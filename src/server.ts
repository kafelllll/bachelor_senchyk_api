import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import announcementRoutes from './routes/announcement.routes.js';
import plantRoutes from './routes/plant.routes.js';
import uploadRoutes from './routes/uploadRoutes.cjs';
import { normalizeRequestStrings } from './middlewares/normalize.middleware.js';

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

app.get('/', (req, res) => {
  res.send('Працює на TypeScript!');
});

app.listen(PORT, () => {
  console.log(`Сервер: http://localhost:${PORT}`);
});