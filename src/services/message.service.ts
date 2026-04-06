import * as messageRepository from '../repositories/message.repository.js';
import * as userRepository from '../repositories/user.repository.js';
import * as announcementRepository from '../repositories/announcement.repository.js';
import type { CreateMessageInput, GetConversationsQuery, DeleteConversationQuery } from '../types/message.types.js';
import { getUserStatsMap } from './userStats.service.js';

const normalizeContent = (content: string) => content.trim().replace(/\s+/g, ' ');

const buildConversationKey = (userId: string, otherUserId: string) => {
  return `${userId}::${otherUserId}`;
};

export const createMessage = async (senderId: string, data: CreateMessageInput) => {
  if (senderId === data.receiverId) {
    throw new Error('Cannot message yourself');
  }

  const receiver = await userRepository.findUserById(data.receiverId);
  if (!receiver) {
    throw new Error('Receiver not found');
  }

  if (data.announcementId) {
    const announcement = await announcementRepository.findAnnouncementByIdPublic(data.announcementId);
    if (!announcement) {
      throw new Error('Announcement not found');
    }
  }

  return messageRepository.createMessage({
    sender: { connect: { id: senderId } },
    receiver: { connect: { id: data.receiverId } },
    ...(data.announcementId ? { announcement: { connect: { id: data.announcementId } } } : {}),
    content: normalizeContent(data.content),
  });
};

export const getMessagesBetweenUsers = async (
  userId: string,
  otherUserId: string,
  announcementId?: string | null,
  limit?: number,
) => {
  const take = Math.min(limit ?? 100, 200);
  const messages = await messageRepository.findMessagesBetweenUsers({
    userId,
    otherUserId,
    limit: take,
    ...(announcementId !== undefined ? { announcementId } : {}),
  });

  await messageRepository.markMessagesRead({
    userId,
    otherUserId,
    ...(announcementId !== undefined ? { announcementId } : {}),
  });

  return messages.slice().reverse();
};

export const getConversations = async (userId: string, query: GetConversationsQuery) => {
  const take = Math.min(query.limit ?? 200, 200);
  const [recentMessages, unreadCounts] = await Promise.all([
    messageRepository.findRecentMessagesForUser({ userId, limit: take }),
    messageRepository.countUnreadBySender({ userId }),
  ]);

  const unreadMap = new Map<string, number>();
  type UnreadRow = Awaited<ReturnType<typeof messageRepository.countUnreadBySender>>[number];
  unreadCounts.forEach((row: UnreadRow) => {
    const key = buildConversationKey(userId, row.senderId);
    unreadMap.set(key, row._count._all);
  });

  const seen = new Set<string>();
  const conversations = [] as Array<{
    participant: { id: string; name: string; avatar: string | null };
    announcementId: string | null;
    announcement: { id: string; plantName: string } | null;
    lastMessage: typeof recentMessages[number];
    unreadCount: number;
  }>;

  for (const message of recentMessages) {
    const isSender = message.senderId === userId;
    const participant = isSender ? message.receiver : message.sender;
    const key = buildConversationKey(userId, participant.id);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);

    conversations.push({
      participant,
      announcementId: message.announcementId ?? null,
      announcement: message.announcement ?? null,
      lastMessage: message,
      unreadCount: unreadMap.get(key) ?? 0,
    });
  }

  const participantIds = conversations.map((conversation) => conversation.participant.id);
  const statsMap = await getUserStatsMap(participantIds);

  return conversations.map((conversation) => {
    const stats = statsMap.get(conversation.participant.id);
    if (!stats) return conversation;
    return {
      ...conversation,
      participant: {
        ...conversation.participant,
        rating: stats,
      },
    };
  });
};

export const deleteConversation = async (
  userId: string,
  query: DeleteConversationQuery,
) => {
  const otherUserId = query.userId;
  return messageRepository.deleteConversationMessages({
    userId,
    otherUserId,
    announcementId: query.announcementId ?? null,
  });
};

export const getUnreadCount = async (userId: string) => {
  return messageRepository.countUnreadForUser(userId);
};
