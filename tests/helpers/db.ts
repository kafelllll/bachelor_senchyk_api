import bcrypt from 'bcrypt';
import prisma from '../../src/config/prisma.js';
import { generateToken } from '../../src/utils/jwt.js';

const TEST_DB_PATTERN = /(test|localhost|127\.0\.0\.1)/i;

export const ensureTestDbConfigured = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set. Configure .env.test for integration tests.');
  }
  if (!TEST_DB_PATTERN.test(dbUrl)) {
    throw new Error('Refusing to run integration tests on non-test DATABASE_URL.');
  }
};

export const resetDatabase = async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Message", "Rating", "Exchange", "Announcement", "Token", "User" RESTART IDENTITY CASCADE;',
  );
};

export const disconnectDatabase = async () => {
  await prisma.$disconnect();
};

export const createUser = async ({
  name,
  email,
  password = 'Password123',
  emailVerified = true,
} = {}) => {
  const safeName = name || `User-${Math.random().toString(16).slice(2, 8)}`;
  const safeEmail = email || `user-${Math.random().toString(16).slice(2, 8)}@test.local`;
  const passwordHash = await bcrypt.hash(password, 10);

  return prisma.user.create({
    data: {
      name: safeName,
      email: safeEmail,
      passwordHash,
      emailVerified,
      emailVerifiedAt: emailVerified ? new Date() : null,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
    },
  });
};

export const issueAuthTokenForUser = async (user) => {
  const token = generateToken({ id: user.id, email: user.email });
  await prisma.token.create({ data: { token, userId: user.id, type: 'auth' } });
  return token;
};

export const authHeaderForUser = async (user) => {
  const token = await issueAuthTokenForUser(user);
  return `Bearer ${token}`;
};

export const createAnnouncement = async (userId, overrides = {}) => {
  const unique = Math.random().toString(16).slice(2, 7);
  return prisma.announcement.create({
    data: {
      userId,
      plantName: `Ficus ${unique}`,
      offerType: 'offer',
      category: 'indoor',
      size: 'medium',
      condition: 'healthy',
      careLevel: 'easy',
      city: 'Kyiv',
      district: 'Pechersk',
      description: 'Healthy plant for exchange',
      additionalTags: ['green'],
      pestFree: true,
      readyToExchange: true,
      genus: 'Ficus',
      family: 'Moraceae',
      commonName: 'Rubber plant',
      photos: ['https://example.com/photo.jpg'],
      coverPhoto: 'https://example.com/photo.jpg',
      wateringFreq: 'moderate',
      lightReqs: 'bright',
      humidity: 'medium',
      toxicity: 'slightly-toxic',
      growthRate: 'moderate',
      hasOffspring: false,
      status: 'active',
      ...overrides,
    },
  });
};

export const createAcceptedExchange = async ({ initiatorId, receiverId, announcementId, offeredAnnouncementId }) => {
  return prisma.exchange.create({
    data: {
      initiatorId,
      receiverId,
      announcementId,
      offeredAnnouncementId,
      status: 'accepted',
    },
  });
};

export { prisma };
