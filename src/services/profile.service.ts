import * as userRepository from '../repositories/user.repository.js';
import * as announcementRepository from '../repositories/announcement.repository.js';
import { calculateTrustScore } from '../utils/trust.js';
import { updateProfileSchema } from '../validations/profile.validation.js';
import type { z } from 'zod';

type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];

const normalizeString = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const getMyProfile = async (userId: string) => {
  const profile = await userRepository.findProfileByUserId(userId);
  if (!profile) {
    throw new Error('User not found');
  }

  const [activeAnnouncementsCount, totalAnnouncementsCount] = await Promise.all([
    announcementRepository.countActiveAnnouncements(userId),
    announcementRepository.countAnnouncementsByUser(userId),
  ]);

  const trust = calculateTrustScore({
    emailVerified: profile.emailVerified,
    name: profile.name,
    avatar: profile.avatar ?? null,
    city: profile.city ?? null,
    bio: profile.bio ?? null,
    activeAnnouncementsCount,
    totalAnnouncementsCount,
    createdAt: profile.createdAt,
  });

  const accountAgeDays = Math.floor((Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const isAccountOlderThan7Days = accountAgeDays > 7;

  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    avatar: profile.avatar ?? null,
    city: profile.city ?? null,
    bio: profile.bio ?? null,
    isEmailVerified: profile.emailVerified,
    emailVerified: profile.emailVerified,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
    reputationScore: trust.trustScore,
    trustScore: trust.trustScore,
    trustLevel: trust.trustLevel,
    accountAgeDays,
    isAccountOlderThan7Days,
    activeAnnouncementsCount,
    totalAnnouncementsCount,
  };
};

export const updateMyProfile = async (userId: string, data: UpdateProfileInput) => {
  const payload = {
    ...(data.name !== undefined ? { name: normalizeString(data.name) ?? '' } : {}),
    ...(data.avatar !== undefined ? { avatar: normalizeString(data.avatar) } : {}),
    ...(data.city !== undefined ? { city: normalizeString(data.city) } : {}),
    ...(data.bio !== undefined ? { bio: normalizeString(data.bio) } : {}),
  };

  const updated = await userRepository.updateUserById(userId, payload);

  const [activeAnnouncementsCount, totalAnnouncementsCount] = await Promise.all([
    announcementRepository.countActiveAnnouncements(userId),
    announcementRepository.countAnnouncementsByUser(userId),
  ]);

  const trust = calculateTrustScore({
    emailVerified: updated.emailVerified,
    name: updated.name,
    avatar: updated.avatar ?? null,
    city: updated.city ?? null,
    bio: updated.bio ?? null,
    activeAnnouncementsCount,
    totalAnnouncementsCount,
    createdAt: updated.createdAt,
  });

  const accountAgeDays = Math.floor((Date.now() - updated.createdAt.getTime()) / (1000 * 60 * 60 * 24));
  const isAccountOlderThan7Days = accountAgeDays > 7;

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    avatar: updated.avatar ?? null,
    city: updated.city ?? null,
    bio: updated.bio ?? null,
    isEmailVerified: updated.emailVerified,
    emailVerified: updated.emailVerified,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    reputationScore: trust.trustScore,
    trustScore: trust.trustScore,
    trustLevel: trust.trustLevel,
    accountAgeDays,
    isAccountOlderThan7Days,
    activeAnnouncementsCount,
    totalAnnouncementsCount,
  };
};

export const deleteMyAccount = async (userId: string) => {
  await userRepository.deleteUserById(userId);
  return true;
};
