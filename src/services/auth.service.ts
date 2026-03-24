import bcrypt from 'bcrypt';
import type { Prisma } from '@prisma/client';
import { generateToken } from '../utils/jwt.js';
import * as userRepository from '../repositories/user.repository.js';
import * as tokenRepository from '../repositories/token.repository.js';
import type { RegisterUserInput, LoginUserInput } from '../types/auth.types.js';

type AuthUserRecord = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  termsAccepted: boolean;
  termsAcceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const registerUser = async (data: RegisterUserInput) => {
  const existingUser = await userRepository.findUserByEmail(data.email);
  if (existingUser) throw new Error('User already exists');

  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  const newUser = {
    name: data.name,
    email: data.email,
    passwordHash: hashedPassword,
    role: 'user', // Default role
    termsAccepted: data.termsAccepted,
    termsAcceptedAt: data.termsAccepted ? new Date() : null,
  } as unknown as Prisma.UserCreateInput;

  const createdUser = (await userRepository.createUser(newUser)) as unknown as AuthUserRecord;

  const token = generateToken({ id: createdUser.id, email: createdUser.email, role: createdUser.role });
  await tokenRepository.saveToken(createdUser.id, token);

  return {
    user: {
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      termsAccepted: createdUser.termsAccepted,
      createdAt: createdUser.createdAt
    },
    token
  };
};

export const loginUser = async (data: LoginUserInput) => {
  const user = (await userRepository.findUserByEmail(data.email)) as AuthUserRecord | null;
  if (!user) throw new Error('Invalid credentials');

  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) throw new Error('Invalid credentials');

  const token = generateToken({ id: user.id, email: user.email, role: user.role });
  await tokenRepository.saveToken(user.id, token);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      termsAccepted: user.termsAccepted,
      createdAt: user.createdAt
    },
    token
  };
};

export const logoutUser = async (token: string) => {
  await tokenRepository.deleteToken(token);
};

export const getUserById = async (id: string) => {
  const user = (await userRepository.findUserById(id)) as AuthUserRecord | null;
  if (!user) throw new Error('User not found');
  
  // Return safe user object
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    termsAccepted: user.termsAccepted,
    createdAt: user.createdAt
  };
};
