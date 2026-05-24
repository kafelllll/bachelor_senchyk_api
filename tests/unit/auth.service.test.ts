import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const userRepository = {
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  findUserById: jest.fn(),
  markEmailVerified: jest.fn(),
};

const tokenRepository = {
  saveToken: jest.fn(),
  findToken: jest.fn(),
  deleteToken: jest.fn(),
  deleteTokensByUserIdAndType: jest.fn(),
};

const emailService = {
  sendVerificationEmail: jest.fn(),
};

const bcryptMock = {
  hash: jest.fn(),
  compare: jest.fn(),
};

const jwtMock = {
  generateToken: jest.fn(),
};

jest.unstable_mockModule('../../src/repositories/user.repository.js', () => userRepository);
jest.unstable_mockModule('../../src/repositories/token.repository.js', () => tokenRepository);
jest.unstable_mockModule('../../src/services/email.service.js', () => emailService);
jest.unstable_mockModule('bcrypt', () => ({ default: bcryptMock }));
jest.unstable_mockModule('../../src/utils/jwt.js', () => jwtMock);

const authService = await import('../../src/services/auth.service.js');

describe('auth.service unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcryptMock.hash.mockResolvedValue('hashed-pass');
    bcryptMock.compare.mockResolvedValue(true);
    jwtMock.generateToken.mockReturnValue('jwt-token');
  });

  it('registers user and sends verification email', async () => {
    userRepository.findUserByEmail.mockResolvedValue(null);
    userRepository.createUser.mockResolvedValue({
      id: 'u1',
      name: 'User',
      email: 'user@test.local',
      createdAt: new Date(),
      emailVerified: false,
      termsAccepted: true,
    });

    const result = await authService.registerUser({
      name: 'User',
      email: 'user@test.local',
      password: 'Password123',
      termsAccepted: true,
    });

    expect(result.user.email).toBe('user@test.local');
    expect(emailService.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(tokenRepository.saveToken).toHaveBeenCalledWith(
      'u1',
      expect.any(String),
      'email_verification',
      expect.any(Date),
    );
  });

  it('rejects duplicate registration', async () => {
    userRepository.findUserByEmail.mockResolvedValue({ id: 'existing' });

    await expect(
      authService.registerUser({
        name: 'User',
        email: 'user@test.local',
        password: 'Password123',
        termsAccepted: true,
      }),
    ).rejects.toThrow('User already exists');
  });

  it('logs in verified user and stores auth token', async () => {
    userRepository.findUserByEmail.mockResolvedValue({
      id: 'u1',
      name: 'User',
      email: 'user@test.local',
      passwordHash: 'hashed-pass',
      emailVerified: true,
      termsAccepted: true,
      createdAt: new Date(),
    });

    const result = await authService.loginUser({ email: 'user@test.local', password: 'Password123' });

    expect(result.token).toBe('jwt-token');
    expect(tokenRepository.saveToken).toHaveBeenCalledWith('u1', 'jwt-token', 'auth');
  });

  it('rejects login when email is not verified', async () => {
    userRepository.findUserByEmail.mockResolvedValue({
      id: 'u1',
      email: 'user@test.local',
      passwordHash: 'hashed-pass',
      emailVerified: false,
    });

    await expect(authService.loginUser({ email: 'user@test.local', password: 'Password123' })).rejects.toThrow(
      'Email not verified',
    );
  });

  it('verifies email by token and issues auth token', async () => {
    tokenRepository.findToken.mockResolvedValue({ userId: 'u1', expiresAt: new Date(Date.now() + 60_000) });
    userRepository.markEmailVerified.mockResolvedValue({
      id: 'u1',
      name: 'User',
      email: 'user@test.local',
      emailVerified: true,
      termsAccepted: true,
      createdAt: new Date(),
    });

    const result = await authService.verifyEmail('123456');

    expect(result.token).toBe('jwt-token');
    expect(tokenRepository.deleteToken).toHaveBeenCalledWith('123456', 'email_verification');
    expect(tokenRepository.saveToken).toHaveBeenCalledWith('u1', 'jwt-token', 'auth');
  });

  it('resend returns already_verified for verified user', async () => {
    userRepository.findUserByEmail.mockResolvedValue({ id: 'u1', emailVerified: true });

    const result = await authService.resendVerificationEmail('user@test.local');

    expect(result).toEqual({ status: 'already_verified' });
    expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
