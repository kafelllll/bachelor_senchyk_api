import prisma from '../config/prisma.js';

export const saveToken = async (userId: string, token: string) => {
  return prisma.token.create({
    data: {
      userId,
      token,
    },
  });
};

export const findToken = async (token: string) => {
  return prisma.token.findUnique({
    where: { token },
  });
};

export const deleteToken = async (token: string) => {
  return prisma.token.delete({
    where: { token },
  });
};

export const deleteAllUserTokens = async (userId: string) => {
  return prisma.token.deleteMany({
    where: { userId },
  });
};
