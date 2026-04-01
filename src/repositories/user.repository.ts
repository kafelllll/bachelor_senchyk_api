import prisma from '../config/prisma.js';
import type { Prisma } from '@prisma/client';

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      emailVerifiedAt: true,
      role: true,
      termsAccepted: true,
      termsAcceptedAt: true,
      createdAt: true,
      updatedAt: true
    } as any
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = async (userData: Prisma.UserCreateInput) => {
  return prisma.user.create({ data: userData });
};

export const markEmailVerified = async (id: string) => {
  return prisma.user.update({
    where: { id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    } as any,
  });
};

