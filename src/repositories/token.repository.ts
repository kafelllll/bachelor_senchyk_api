import prisma from '../config/prisma.js';

export const saveToken = async (userId: string, token: string, type = 'auth', expiresAt?: Date | null) => {
  return prisma.token.create({
    data: {
      userId,
      token,
      type,
      ...(expiresAt ? { expiresAt } : {}),
    },
  });
};

export const findToken = async (token: string, type = 'auth') => {
  const record = await prisma.token.findUnique({
    where: { token },
  });
  if (!record || record.type !== type) {
    return null;
  }
  return record;
};

export const deleteToken = async (token: string, type = 'auth') => {
  const existing = await findToken(token, type);
  if (!existing) {
    return null;
  }
  return prisma.token.delete({
    where: { token },
  });
};

export const deleteAllUserTokens = async (userId: string) => {
  return prisma.token.deleteMany({
    where: { userId },
  });
};

export const deleteTokensByUserIdAndType = async (userId: string, type = 'auth') => {
  return prisma.token.deleteMany({
    where: { userId, type },
  });
};
