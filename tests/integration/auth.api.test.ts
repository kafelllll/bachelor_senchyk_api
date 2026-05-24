import request from 'supertest';
import { beforeAll, beforeEach, afterAll, describe, expect, it, jest } from '@jest/globals';

import { ensureTestDbConfigured, resetDatabase, disconnectDatabase, prisma } from '../helpers/db.js';

let app;

beforeAll(async () => {
  ensureTestDbConfigured();

  jest.unstable_mockModule('../../src/services/email.service.js', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendMessageNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendExchangeInitiatedEmail: jest.fn().mockResolvedValue(undefined),
    sendRatingNotificationEmail: jest.fn().mockResolvedValue(undefined),
  }));

  const { createTestApp } = await import('../helpers/create-test-app.js');
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('Auth API integration', () => {
  it('registers user and requires email verification before login', async () => {
    const registerRes = await request(app).post('/auth/register').send({
      name: 'User A',
      email: 'usera@test.local',
      password: 'Password123',
      confirmPassword: 'Password123',
      termsAccepted: true,
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);

    const loginRes = await request(app).post('/auth/login').send({
      email: 'usera@test.local',
      password: 'Password123',
    });

    expect(loginRes.status).toBe(403);
    expect(loginRes.body.message).toBe('Email not verified');
  });

  it('verifies email, allows login, me, and logout flow', async () => {
    await request(app).post('/auth/register').send({
      name: 'User B',
      email: 'userb@test.local',
      password: 'Password123',
      confirmPassword: 'Password123',
      termsAccepted: true,
    });

    const user = await prisma.user.findUnique({ where: { email: 'userb@test.local' } });
    const tokenRow = await prisma.token.findFirst({
      where: { userId: user.id, type: 'email_verification' },
      orderBy: { createdAt: 'desc' },
    });

    const verifyRes = await request(app).post('/auth/verify-email').send({ token: tokenRow.token });
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.token).toBeTruthy();

    const verifiedAuthHeader = `Bearer ${verifyRes.body.token}`;
    const meAfterVerify = await request(app).get('/auth/me').set('Authorization', verifiedAuthHeader);
    expect(meAfterVerify.status).toBe(200);
    expect(meAfterVerify.body.user.email).toBe('userb@test.local');

    const logoutVerifiedRes = await request(app).post('/auth/logout').set('Authorization', verifiedAuthHeader);
    expect(logoutVerifiedRes.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const loginRes = await request(app).post('/auth/login').send({
      email: 'userb@test.local',
      password: 'Password123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeTruthy();

    const authHeader = `Bearer ${loginRes.body.token}`;

    const meRes = await request(app).get('/auth/me').set('Authorization', authHeader);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe('userb@test.local');

    const logoutRes = await request(app).post('/auth/logout').set('Authorization', authHeader);
    expect(logoutRes.status).toBe(200);

    const meAfterLogout = await request(app).get('/auth/me').set('Authorization', authHeader);
    expect(meAfterLogout.status).toBe(401);
  });

  it('rejects missing and invalid token on protected routes', async () => {
    const missingRes = await request(app).get('/auth/me');
    expect(missingRes.status).toBe(401);

    const invalidRes = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer invalid.token.value');
    expect(invalidRes.status).toBe(401);
  });

  it('resends verification email for unverified users', async () => {
    await request(app).post('/auth/register').send({
      name: 'User C',
      email: 'userc@test.local',
      password: 'Password123',
      confirmPassword: 'Password123',
      termsAccepted: true,
    });

    const resendRes = await request(app)
      .post('/auth/resend-verification')
      .send({ email: 'userc@test.local' });

    expect(resendRes.status).toBe(200);
    expect(resendRes.body.success).toBe(true);
  });
});
