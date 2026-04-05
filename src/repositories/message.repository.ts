import prisma from '../config/prisma.js';

const messageSelect = {
  id: true,
  senderId: true,
  receiverId: true,
  announcementId: true,
  content: true,
  createdAt: true,
  updatedAt: true,
  readAt: true,
  sender: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
  receiver: {
    select: {
      id: true,
      name: true,
      avatar: true,
    },
  },
} as const;

type MessageCreateInput = {
  sender: { connect: { id: string } };
  receiver: { connect: { id: string } };
  announcement?: { connect: { id: string } };
  content: string;
};

type MessageFindManyWhere = {
  OR: Array<{ senderId: string; receiverId: string }>;
  announcementId?: string | null;
};

type MessageUpdateManyWhere = {
  receiverId: string;
  senderId: string;
  readAt: null;
  announcementId?: string | null;
};

type UnreadCountRow = {
  senderId: string;
  _count: { _all: number };
};

export const createMessage = async (data: MessageCreateInput) => {
  return prisma.message.create({ data, select: messageSelect });
};

export const findMessagesBetweenUsers = async (params: {
  userId: string;
  otherUserId: string;
  announcementId?: string | null;
  limit?: number;
}) => {
  const { userId, otherUserId, announcementId, limit } = params;
  const where: MessageFindManyWhere = {
    OR: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  };

  if (announcementId !== undefined) {
    where.announcementId = announcementId;
  }

  return prisma.message.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: messageSelect,
  });
};

export const markMessagesRead = async (params: {
  userId: string;
  otherUserId: string;
  announcementId?: string | null;
}) => {
  const { userId, otherUserId, announcementId } = params;
  const where: MessageUpdateManyWhere = {
    receiverId: userId,
    senderId: otherUserId,
    readAt: null,
  };

  if (announcementId !== undefined) {
    where.announcementId = announcementId;
  }

  return prisma.message.updateMany({
    where,
    data: { readAt: new Date() },
  });
};

export const findRecentMessagesForUser = async (params: { userId: string; limit: number }) => {
  const { userId, limit } = params;
  return prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: messageSelect,
  });
};

export const countUnreadBySender = async (params: { userId: string }): Promise<UnreadCountRow[]> => {
  const { userId } = params;
  return prisma.message.groupBy({
    by: ['senderId'],
    where: {
      receiverId: userId,
      readAt: null,
    },
    _count: {
      _all: true,
    },
  });
};

export const deleteConversationMessages = async (params: {
  userId: string;
  otherUserId: string;
  announcementId?: string | null;
}) => {
  const { userId, otherUserId, announcementId } = params;
  const where: MessageFindManyWhere = {
    OR: [
      { senderId: userId, receiverId: otherUserId },
      { senderId: otherUserId, receiverId: userId },
    ],
  };

  if (announcementId !== undefined) {
    where.announcementId = announcementId;
  }

  return prisma.message.deleteMany({ where });
};

export const countUnreadForUser = async (userId: string) => {
  return prisma.message.count({
    where: {
      receiverId: userId,
      readAt: null,
    },
  });
};
