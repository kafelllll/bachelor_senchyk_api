import express from 'express';
import crypto from 'node:crypto';

const port = Number(process.env.FUNCTIONAL_TEST_PORT || 3101);
const app = express();
app.use(express.json());

const users = new Map();
const tokens = new Map();
const exchanges = new Map();
const ratings = [];

const makeId = () => crypto.randomUUID();

app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

app.post('/auth/register', (req, res) => {
  const { name, email, password, confirmPassword, termsAccepted } = req.body || {};
  if (!name || !email || !password || password !== confirmPassword || termsAccepted !== true) {
    return res.status(400).json({ success: false, message: 'Validation failed' });
  }

  if ([...users.values()].some((u) => u.email === email)) {
    return res.status(409).json({ success: false, message: 'User already exists' });
  }

  const id = makeId();
  const user = { id, name, email, password, emailVerified: true };
  users.set(id, user);

  return res.status(201).json({ success: true, user: { id, name, email } });
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = [...users.values()].find((u) => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = `t_${makeId()}`;
  tokens.set(token, user.id);
  return res.status(200).json({ success: true, token, user: { id: user.id, email: user.email, name: user.name } });
});

const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const userId = tokens.get(token);

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  req.userId = userId;
  next();
};

app.post('/exchanges', auth, (req, res) => {
  const { announcementId, receiverId } = req.body || {};
  if (!announcementId || !receiverId) {
    return res.status(400).json({ success: false, message: 'Validation failed' });
  }

  const id = makeId();
  const exchange = {
    id,
    announcementId,
    initiatorId: req.userId,
    receiverId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    initiatorCompletedAt: null,
    receiverCompletedAt: null,
  };

  exchanges.set(id, exchange);
  return res.status(201).json({ success: true, exchange });
});

app.patch('/exchanges/:id/status', auth, (req, res) => {
  const exchange = exchanges.get(req.params.id);
  if (!exchange) {
    return res.status(404).json({ success: false, message: 'Exchange not found' });
  }

  if (exchange.initiatorId !== req.userId && exchange.receiverId !== req.userId) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const nextStatus = req.body?.status;
  if (nextStatus === 'accepted') {
    exchange.status = 'accepted';
    exchange.updatedAt = new Date().toISOString();
    return res.status(200).json({ success: true, exchange });
  }

  if (nextStatus === 'cancelled') {
    exchange.status = 'cancelled';
    exchange.updatedAt = new Date().toISOString();
    return res.status(200).json({ success: true, exchange });
  }

  if (nextStatus === 'completed') {
    return res.status(400).json({ success: false, message: 'Use /exchanges/:id/confirm-completion' });
  }

  return res.status(400).json({ success: false, message: 'Invalid status transition' });
});

app.post('/exchanges/:id/confirm-completion', auth, (req, res) => {
  const exchange = exchanges.get(req.params.id);
  if (!exchange) {
    return res.status(404).json({ success: false, message: 'Exchange not found' });
  }

  if (exchange.status !== 'accepted') {
    return res.status(400).json({ success: false, message: 'Exchange must be accepted before completion confirmation' });
  }

  if (exchange.initiatorId !== req.userId && exchange.receiverId !== req.userId) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  const now = new Date().toISOString();
  if (exchange.initiatorId === req.userId) {
    if (exchange.initiatorCompletedAt) {
      return res.status(409).json({ success: false, message: 'Completion already confirmed by this user' });
    }
    exchange.initiatorCompletedAt = now;
  } else {
    if (exchange.receiverCompletedAt) {
      return res.status(409).json({ success: false, message: 'Completion already confirmed by this user' });
    }
    exchange.receiverCompletedAt = now;
  }

  if (exchange.initiatorCompletedAt && exchange.receiverCompletedAt) {
    exchange.status = 'completed';
    exchange.completedAt = now;
  }

  exchange.updatedAt = now;
  return res.status(200).json({ success: true, exchange });
});

app.get('/exchanges/my', auth, (req, res) => {
  const myExchanges = [...exchanges.values()]
    .filter((exchange) => exchange.initiatorId === req.userId || exchange.receiverId === req.userId)
    .map((exchange) => {
      const otherUserId = exchange.initiatorId === req.userId ? exchange.receiverId : exchange.initiatorId;
      const ratingRequired = exchange.status === 'completed' && !ratings.some((r) => r.exchangeId === exchange.id && r.fromUserId === req.userId);
      return {
        ...exchange,
        ratingRequired,
        ratingTarget: ratingRequired ? { id: otherUserId } : null,
      };
    });

  return res.status(200).json({ success: true, exchanges: myExchanges });
});

app.post('/ratings', auth, (req, res) => {
  const { exchangeId, toUserId, score, comment } = req.body || {};
  const exchange = exchanges.get(exchangeId);

  if (!exchange) {
    return res.status(404).json({ success: false, message: 'Exchange not found' });
  }

  if (exchange.status !== 'completed') {
    return res.status(400).json({ success: false, message: 'Exchange is not completed' });
  }

  const otherUserId = exchange.initiatorId === req.userId ? exchange.receiverId : exchange.initiatorId;
  if (toUserId && toUserId !== otherUserId) {
    return res.status(400).json({ success: false, message: 'Invalid rating target' });
  }

  if (ratings.some((r) => r.exchangeId === exchangeId && r.fromUserId === req.userId)) {
    return res.status(409).json({ success: false, message: 'Rating already exists' });
  }

  const rating = {
    id: makeId(),
    exchangeId,
    fromUserId: req.userId,
    toUserId: otherUserId,
    score,
    comment: comment ?? null,
  };

  ratings.push(rating);
  return res.status(201).json({ success: true, rating });
});

const server = app.listen(port, () => {
  console.log(`Functional test server listening on http://127.0.0.1:${port}`);
});

const graceful = () => {
  server.close(() => process.exit(0));
};

process.on('SIGTERM', graceful);
process.on('SIGINT', graceful);
