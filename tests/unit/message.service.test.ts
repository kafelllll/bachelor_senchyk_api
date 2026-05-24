import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const messageRepo = {
  createMessage: jest.fn(),
  findMessagesBetweenUsers: jest.fn(),
  markMessagesRead: jest.fn(),
  findRecentMessagesForUser: jest.fn(),
  countUnreadBySender: jest.fn(),
  deleteConversationMessages: jest.fn(),
  countUnreadForUser: jest.fn(),
};

const userRepo = { findUserById: jest.fn() };
const announcementRepo = { findAnnouncementByIdPublic: jest.fn() };
const userStatsService = { getUserStatsMap: jest.fn() };
const emailSvc = { sendMessageNotificationEmail: jest.fn() };
const logger = { logger: { warn: jest.fn() } };

jest.unstable_mockModule('../../src/repositories/message.repository.js', () => messageRepo);
jest.unstable_mockModule('../../src/repositories/user.repository.js', () => userRepo);
jest.unstable_mockModule('../../src/repositories/announcement.repository.js', () => announcementRepo);
jest.unstable_mockModule('../../src/services/userStats.service.js', () => userStatsService);
jest.unstable_mockModule('../../src/services/email.service.js', () => emailSvc);
jest.unstable_mockModule('../../src/utils/logger.js', () => logger);

const messageService = await import('../../src/services/message.service.js');

describe('message.service unit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    userStatsService.getUserStatsMap.mockResolvedValue(new Map());
  });

  it('rejects self message', async () => {
    await expect(
      messageService.createMessage('u1', { receiverId: 'u1', content: 'hello' }),
    ).rejects.toThrow('Cannot message yourself');
  });

  it('creates message and normalizes content', async () => {
    userRepo.findUserById.mockResolvedValue({ id: 'u2', email: 'u2@test.local', name: 'U2' });
    messageRepo.createMessage.mockResolvedValue({ id: 'm1', receiverId: 'u2', content: 'hello world' });

    const message = await messageService.createMessage('u1', {
      receiverId: 'u2',
      content: '  hello   world  ',
    });

    expect(messageRepo.createMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'hello world' }),
    );
    expect(message.id).toBe('m1');
  });

  it('marks messages as read when getting conversation', async () => {
    messageRepo.findMessagesBetweenUsers.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);

    await messageService.getMessagesBetweenUsers('u1', 'u2', null, 50);

    expect(messageRepo.markMessagesRead).toHaveBeenCalledWith({ userId: 'u1', otherUserId: 'u2', announcementId: null });
  });

  it('returns deduplicated conversations with unread counts', async () => {
    messageRepo.findRecentMessagesForUser.mockResolvedValue([
      {
        id: 'm2',
        senderId: 'u2',
        receiverId: 'u1',
        announcementId: null,
        sender: { id: 'u2', name: 'U2', avatar: null },
        receiver: { id: 'u1', name: 'U1', avatar: null },
        announcement: null,
      },
      {
        id: 'm1',
        senderId: 'u2',
        receiverId: 'u1',
        announcementId: null,
        sender: { id: 'u2', name: 'U2', avatar: null },
        receiver: { id: 'u1', name: 'U1', avatar: null },
        announcement: null,
      },
    ]);
    messageRepo.countUnreadBySender.mockResolvedValue([{ senderId: 'u2', _count: { _all: 2 } }]);

    const conversations = await messageService.getConversations('u1', { limit: 20 });

    expect(conversations).toHaveLength(1);
    expect(conversations[0].unreadCount).toBe(2);
  });
});
