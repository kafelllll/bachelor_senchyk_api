type TrustInputs = {
  emailVerified: boolean;
  name: string | null;
  avatar: string | null;
  city: string | null;
  bio: string | null;
  activeAnnouncementsCount: number;
  totalAnnouncementsCount: number;
  createdAt: Date;
};

type TrustResult = {
  trustScore: number;
  trustLevel: 'low' | 'basic' | 'sufficient' | 'high';
};

const hasValue = (value: string | null | undefined) => Boolean(value && value.trim().length > 0);

export const calculateTrustScore = (input: TrustInputs): TrustResult => {
  let score = 0;

  if (input.emailVerified) score += 30;
  if (hasValue(input.name)) score += 10;
  if (hasValue(input.avatar)) score += 10;
  if (hasValue(input.city)) score += 10;
  if (hasValue(input.bio)) score += 10;
  if (input.activeAnnouncementsCount >= 1) score += 15;
  if (input.totalAnnouncementsCount >= 3) score += 10;

  const ageMs = Date.now() - input.createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays > 7) score += 5;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let trustLevel: TrustResult['trustLevel'] = 'low';
  if (score >= 80) trustLevel = 'high';
  else if (score >= 60) trustLevel = 'sufficient';
  else if (score >= 40) trustLevel = 'basic';

  return { trustScore: score, trustLevel };
};
