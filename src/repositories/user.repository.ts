import prisma from '../config/prisma.js';

const userSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  city: true,
  bio: true,
  emailVerified: true,
  emailVerifiedAt: true,
  role: true,
  termsAccepted: true,
  termsAcceptedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

const profileSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  city: true,
  bio: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const findUserById = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
};

export const findProfileByUserId = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: profileSelect,
  });
};

export const findUserByEmail = async (email: string) => {
  return prisma.user.findUnique({ where: { email } });
};

export const createUser = async (userData: Record<string, unknown>) => {
  return prisma.user.create({ data: userData });
};

export const updateUserById = async (id: string, data: Record<string, unknown>) => {
  return prisma.user.update({
    where: { id },
    data,
    select: profileSelect,
  });
};

export const deleteUserById = async (id: string) => {
  return prisma.user.delete({
    where: { id },
    select: { id: true },
  });
};

export const markEmailVerified = async (id: string) => {
  return prisma.user.update({
    where: { id },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
};

