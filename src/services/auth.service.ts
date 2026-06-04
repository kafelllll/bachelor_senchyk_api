import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { generateToken } from '../utils/jwt.js';
import * as userRepository from '../repositories/user.repository.js';
import * as tokenRepository from '../repositories/token.repository.js';
import { sendVerificationEmail } from './email.service.js';
import type { RegisterUserInput, LoginUserInput } from '../types/auth.types.js';

type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  city?: string | null;
  bio?: string | null;
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  termsAccepted: boolean;
  termsAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const toSafeUser = (user: AuthUserRecord) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  avatar: user.avatar ?? null,
  city: user.city ?? null,
  bio: user.bio ?? null,
  emailVerified: user.emailVerified,
  termsAccepted: user.termsAccepted,
  createdAt: user.createdAt,
});

const getBackendUrl = () => {
  return process.env.BACKEND_URL || 'http://localhost:3000';
};

const getFrontendVerifyUrl = (token: string) => {
  const frontendBase = process.env.FRONTEND_URL;
  if (!frontendBase) {
    return `${getBackendUrl()}/auth/verify-email?token=${token}`;
  }
  return `${frontendBase}/verify-email?token=${token}`;
};

const generateVerificationCode = () => {
  const code = crypto.randomInt(0, 1000000);
  return code.toString().padStart(6, '0');
};

export const registerUser = async (data: RegisterUserInput) => {
  const existingUser = await userRepository.findUserByEmail(data.email);
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  const newUser = {
    name: data.name,
    email: data.email,
    passwordHash: hashedPassword,
    emailVerified: false,
    emailVerifiedAt: null,
    termsAccepted: data.termsAccepted,
    termsAcceptedAt: data.termsAccepted ? new Date() : null,
  } as unknown as Prisma.UserCreateInput;

  const createdUser = (await userRepository.createUser(newUser)) as unknown as AuthUserRecord;

  const verificationToken = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await tokenRepository.saveToken(createdUser.id, verificationToken, 'email_verification', expiresAt);

  const verifyUrl = getFrontendVerifyUrl(verificationToken);
  await sendVerificationEmail(createdUser.email, verifyUrl, verificationToken);

  return {
    user: toSafeUser(createdUser),
  };
};

export const loginUser = async (data: LoginUserInput) => {
  const user = (await userRepository.findUserByEmail(data.email)) as AuthUserRecord | null;
  if (!user) throw new Error('Invalid credentials');

  if (!user.emailVerified) throw new Error('Email not verified');

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) throw new Error('Invalid credentials');

  const token = generateToken({ id: user.id, email: user.email });
  await tokenRepository.saveToken(user.id, token, 'auth');

  return {
    user: toSafeUser(user),
    token
  };
};

export const logoutUser = async (token: string) => {
  await tokenRepository.deleteToken(token, 'auth');
};

export const getUserById = async (id: string) => {
  const user = (await userRepository.findUserById(id)) as AuthUserRecord | null;
  if (!user) throw new Error('User not found');
  return toSafeUser(user);
};

export const verifyEmail = async (token: string) => {
  const tokenRecord = (await tokenRepository.findToken(token, 'email_verification')) as
    | { userId: string; expiresAt?: Date | null }
    | null;
  if (!tokenRecord) throw new Error('Invalid verification token');
  if (tokenRecord.expiresAt && tokenRecord.expiresAt.getTime() < Date.now()) {
    await tokenRepository.deleteToken(token, 'email_verification');
    throw new Error('Verification token expired');
  }

  const updatedUser = (await userRepository.markEmailVerified(tokenRecord.userId)) as AuthUserRecord;
  await tokenRepository.deleteToken(token, 'email_verification');

  const authToken = generateToken({ id: updatedUser.id, email: updatedUser.email });
  await tokenRepository.saveToken(updatedUser.id, authToken, 'auth');

  return {
    user: toSafeUser(updatedUser),
    token: authToken,
  };
};

export const resendVerificationEmail = async (email: string) => {
  const user = (await userRepository.findUserByEmail(email)) as AuthUserRecord | null;
  if (!user) {
    return { status: 'sent' } as const;
  }

  if (user.emailVerified) {
    return { status: 'already_verified' } as const;
  }

  await tokenRepository.deleteTokensByUserIdAndType(user.id, 'email_verification');

  const verificationToken = generateVerificationCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await tokenRepository.saveToken(user.id, verificationToken, 'email_verification', expiresAt);

  const verifyUrl = getFrontendVerifyUrl(verificationToken);
  await sendVerificationEmail(user.email, verifyUrl, verificationToken);

  return { status: 'sent' } as const;
};

