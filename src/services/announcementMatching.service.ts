import * as announcementRepository from '../repositories/announcement.repository.js';
import * as ratingRepository from '../repositories/rating.repository.js';
import { getUserStatsMap } from './userStats.service.js';

type MatchLevel = 'high' | 'medium' | 'low';

type MatchCandidate = {
  id: string;
  plantName: string | null;
  offerType: string;
  category: string;
  size: string | null;
  condition: string | null;
  careLevel: string | null;
  city: string | null;
  district: string | null;
  additionalTags: string[];
  pestFree: boolean | null;
  readyToExchange: boolean | null;
  genus: string | null;
  family: string | null;
  commonName: string | null;
  wateringFreq: string | null;
  lightReqs: string | null;
  humidity: string | null;
  toxicity: string | null;
  growthRate: string | null;
  hasOffspring: boolean | null;
  photos: string[];
  coverPhoto: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  user?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  reputationScore?: number | null;
};

type MatchBase = {
  plantName: string | null;
  userId: string;
  offerType: string;
  category: string;
  size: string | null;
  condition: string | null;
  careLevel: string | null;
  city: string | null;
  district: string | null;
  additionalTags: string[];
  pestFree: boolean | null;
  readyToExchange: boolean | null;
  genus: string | null;
  family: string | null;
  commonName: string | null;
  wateringFreq: string | null;
  lightReqs: string | null;
  humidity: string | null;
  toxicity: string | null;
  growthRate: string | null;
  hasOffspring: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  reputationScore?: number | null;
};

type WeightMap = Record<string, number>;

type WeightedScore = {
  score: number;
  matchLevel: MatchLevel;
  reputationContribution: number;
};

type ScoreParts = {
  plantName: number;
  city: number;
  size: number;
  condition: number;
  careLevel: number;
  wateringFreq: number;
  lightReqs: number;
  district: number;
  additionalTags: number;
  readyToExchange: number;
  pestFree: number;
  nameSupport: number;
  humidity: number;
  toxicity: number;
  growthRate: number;
  hasOffspring: number;
  recency: number;
  reputationScore: number;
};

const RAW_WEIGHTS = {
  plantName: 0.2,
  city: 0.15,
  size: 0.1,
  condition: 0.08,
  careLevel: 0.08,
  wateringFreq: 0.08,
  lightReqs: 0.08,
  district: 0.04,
  additionalTags: 0.05,
  readyToExchange: 0.03,
  pestFree: 0.03,
  nameSupport: 0.04,
  humidity: 0.02,
  toxicity: 0.02,
  growthRate: 0.02,
  hasOffspring: 0.01,
  recency: 0.07,
  reputationScore: 0.03,
} as const satisfies WeightMap;

const normalizeWeights = <T extends Record<string, number>>(weights: T): T => {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total === 0) return weights;
  const normalized = {} as T;
  for (const [key, value] of Object.entries(weights)) {
    normalized[key as keyof T] = Number((value / total).toFixed(6)) as T[keyof T];
  }
  return normalized;
};

const MATCH_WEIGHTS: typeof RAW_WEIGHTS = normalizeWeights(RAW_WEIGHTS);

const MIN_MATCH_SCORE = 10;

const normalizeLower = (value: string | null | undefined): string | null => {
  if (!value) return null;
  return value.trim().toLowerCase();
};

const normalizeOfferTypeForMatch = (value: string | null | undefined): string | null => {
  const lower = value?.toLowerCase();
  if (!lower) return null;
  if (lower === 'give' || lower === 'giveaway' || lower === 'offer') {
    return 'offer';
  }
  if (lower === 'seek' || lower === 'looking' || lower === 'looking-for' || lower === 'looking_for' || lower === 'request') {
    return 'looking-for';
  }
  return lower;
};

const getOfferTypeVariants = (normalizedOfferType: string | null): string[] => {
  if (!normalizedOfferType) return [];
  if (normalizedOfferType === 'offer') return ['offer', 'give', 'giveaway'];
  if (normalizedOfferType === 'looking-for') return ['looking-for', 'looking_for', 'looking', 'seek', 'request'];
  return [normalizedOfferType];
};

const scoreTextMatch = (a: string | null | undefined, b: string | null | undefined): number => {
  const left = normalizeLower(a);
  const right = normalizeLower(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) {
    const minLen = Math.min(left.length, right.length);
    if (minLen < 3) return 0;
    return 0.5;
  }
  return 0;
};

const scoreEnumMatch = (a: string | null | undefined, b: string | null | undefined): number => {
  if (!a || !b) return 0;
  return a === b ? 1 : 0;
};

const scoreBooleanMatch = (a: boolean | null | undefined, b: boolean | null | undefined): number => {
  if (a === null || a === undefined || b === null || b === undefined) return 0;
  return a === b ? 1 : 0;
};

const scoreArrayOverlapRatio = (a: string[] | null | undefined, b: string[] | null | undefined): number => {
  const left = Array.isArray(a) ? a.map(item => normalizeLower(item) || '').filter(Boolean) : [];
  const right = Array.isArray(b) ? b.map(item => normalizeLower(item) || '').filter(Boolean) : [];
  if (left.length === 0 || right.length === 0) return 0;
  const setRight = new Set(right);
  const overlap = left.filter(item => setRight.has(item));
  if (overlap.length === 0) return 0;
  const maxLen = Math.max(left.length, right.length);
  return Math.min(1, overlap.length / maxLen);
};


const scoreNameSupport = (base: MatchBase, candidate: MatchCandidate): number => {
  const scores = [
    scoreTextMatch(base.commonName, candidate.commonName),
    scoreTextMatch(base.genus, candidate.genus),
    scoreTextMatch(base.family, candidate.family),
  ].filter(value => value > 0);

  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, value) => sum + value, 0) / scores.length;
  return Math.min(0.5, avg);
};

const scoreRecency = (createdAt: Date, updatedAt: Date): number => {
  const reference = updatedAt ?? createdAt;
  const ageMs = Date.now() - new Date(reference).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 7) return 1;
  if (ageDays <= 30) return 0.5;
  return 0;
};

const scoreReputation = (value: number | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (value <= 1) return Math.max(0, Math.min(1, value));
  if (value <= 5) return Math.max(0, Math.min(1, value / 5));
  if (value <= 100) return Math.max(0, Math.min(1, value / 100));
  return 1;
};

const passesHardFilters = (base: MatchBase, candidate: MatchCandidate): boolean => {
  const baseOffer = normalizeOfferTypeForMatch(base.offerType);
  const candidateOffer = normalizeOfferTypeForMatch(candidate.offerType);
  const expectedOffer = baseOffer === 'offer' ? 'looking-for' : baseOffer === 'looking-for' ? 'offer' : null;
  if (!expectedOffer || candidateOffer !== expectedOffer) return false;
  if (!base.category || base.category !== candidate.category) return false;
  if (base.userId === candidate.userId) return false;
  return true;
};

const buildScoreParts = (base: MatchBase, candidate: MatchCandidate): ScoreParts => ({
  plantName: scoreTextMatch(base.plantName, candidate.plantName),
  city: scoreTextMatch(base.city, candidate.city),
  size: scoreEnumMatch(base.size, candidate.size),
  condition: scoreEnumMatch(base.condition, candidate.condition),
  careLevel: scoreEnumMatch(base.careLevel, candidate.careLevel),
  wateringFreq: scoreEnumMatch(base.wateringFreq, candidate.wateringFreq),
  lightReqs: scoreEnumMatch(base.lightReqs, candidate.lightReqs),
  district: scoreTextMatch(base.district, candidate.district),
  additionalTags: scoreArrayOverlapRatio(base.additionalTags, candidate.additionalTags),
  readyToExchange: scoreBooleanMatch(base.readyToExchange, candidate.readyToExchange),
  pestFree: scoreBooleanMatch(base.pestFree, candidate.pestFree),
  nameSupport: scoreNameSupport(base, candidate),
  humidity: scoreEnumMatch(base.humidity, candidate.humidity),
  toxicity: scoreEnumMatch(base.toxicity, candidate.toxicity),
  growthRate: scoreEnumMatch(base.growthRate, candidate.growthRate),
  hasOffspring: scoreBooleanMatch(base.hasOffspring, candidate.hasOffspring),
  recency: scoreRecency(candidate.createdAt, candidate.updatedAt),
  reputationScore: scoreReputation(candidate.reputationScore ?? null),
});

const scoreMatch = (base: MatchBase, candidate: MatchCandidate): WeightedScore => {
  const scores = buildScoreParts(base, candidate);
  const rawScore =
    MATCH_WEIGHTS.plantName * scores.plantName +
    MATCH_WEIGHTS.city * scores.city +
    MATCH_WEIGHTS.size * scores.size +
    MATCH_WEIGHTS.condition * scores.condition +
    MATCH_WEIGHTS.careLevel * scores.careLevel +
    MATCH_WEIGHTS.wateringFreq * scores.wateringFreq +
    MATCH_WEIGHTS.lightReqs * scores.lightReqs +
    MATCH_WEIGHTS.district * scores.district +
    MATCH_WEIGHTS.additionalTags * scores.additionalTags +
    MATCH_WEIGHTS.readyToExchange * scores.readyToExchange +
    MATCH_WEIGHTS.pestFree * scores.pestFree +
    MATCH_WEIGHTS.nameSupport * scores.nameSupport +
    MATCH_WEIGHTS.humidity * scores.humidity +
    MATCH_WEIGHTS.toxicity * scores.toxicity +
    MATCH_WEIGHTS.growthRate * scores.growthRate +
    MATCH_WEIGHTS.hasOffspring * scores.hasOffspring +
    MATCH_WEIGHTS.recency * scores.recency +
    MATCH_WEIGHTS.reputationScore * scores.reputationScore;

  const score = Number((rawScore * 100).toFixed(2));
  const matchLevel: MatchLevel = score > 80 ? 'high' : score >= 50 ? 'medium' : 'low';
  const reputationContribution = Number((MATCH_WEIGHTS.reputationScore * scores.reputationScore * 100).toFixed(2));

  return { score, matchLevel, reputationContribution };
};

const buildScoredMatches = (base: MatchBase, candidates: MatchCandidate[]) => {
  return candidates
    .filter((candidate) => passesHardFilters(base, candidate))
    .map((candidate) => {
      const scored = scoreMatch(base, candidate);
      return {
        ...candidate,
        ...scored,
        matchScore: scored.score,
      };
    })
    .filter((candidate) => candidate.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score);
};

const attachReputationScores = async (candidates: MatchCandidate[]) => {
  const userIds = Array.from(new Set(candidates.map((candidate) => candidate.userId)));
  if (userIds.length === 0) {
    return candidates;
  }

  const ratingMap = new Map<string, number>();
  try {
    const ratings = await ratingRepository.getAverageRatingsByUserIds(userIds);
    type RatingRow = Awaited<ReturnType<typeof ratingRepository.getAverageRatingsByUserIds>>[number];
    ratings.forEach((row: RatingRow) => {
      if (row._avg.score !== null) {
        ratingMap.set(row.toUserId, row._avg.score);
      }
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[matches] reputation lookup failed:', (error as Error)?.message ?? error);
    }
  }

  return candidates.map((candidate) => ({
    ...candidate,
    reputationScore: ratingMap.get(candidate.userId) ?? null,
  }));
};

const attachUserRatings = async (candidates: MatchCandidate[]) => {
  const statsMap = await getUserStatsMap(candidates.map((candidate) => candidate.userId));
  return candidates.map((candidate) => {
    if (!candidate.user) return candidate;
    const stats = statsMap.get(candidate.userId);
    return {
      ...candidate,
      user: {
        ...candidate.user,
        ...(stats ? { rating: stats } : {}),
      },
    };
  });
};

const toMatchBase = (baseAnnouncement: any): MatchBase => ({
  plantName: baseAnnouncement.plantName,
  userId: baseAnnouncement.userId,
  offerType: baseAnnouncement.offerType,
  category: baseAnnouncement.category,
  size: baseAnnouncement.size,
  condition: baseAnnouncement.condition,
  careLevel: baseAnnouncement.careLevel,
  city: baseAnnouncement.city,
  district: baseAnnouncement.district ?? null,
  additionalTags: baseAnnouncement.additionalTags ?? [],
  pestFree: baseAnnouncement.pestFree ?? null,
  readyToExchange: baseAnnouncement.readyToExchange ?? null,
  genus: baseAnnouncement.genus ?? null,
  family: baseAnnouncement.family ?? null,
  commonName: baseAnnouncement.commonName ?? null,
  wateringFreq: baseAnnouncement.wateringFreq ?? null,
  lightReqs: baseAnnouncement.lightReqs ?? null,
  humidity: baseAnnouncement.humidity ?? null,
  toxicity: baseAnnouncement.toxicity ?? null,
  growthRate: baseAnnouncement.growthRate ?? null,
  hasOffspring: baseAnnouncement.hasOffspring ?? null,
  createdAt: baseAnnouncement.createdAt,
  updatedAt: baseAnnouncement.updatedAt,
  reputationScore: null,
});

export const getAnnouncementMatches = async (userId: string, announcementId: string) => {
  const baseAnnouncement = await announcementRepository.findAnnouncementById(announcementId, userId);
  if (!baseAnnouncement) {
    return null;
  }

  const shouldLog = process.env.NODE_ENV === 'development';

  const normalizedOfferType = normalizeOfferTypeForMatch(baseAnnouncement.offerType);
  const oppositeOfferType = normalizedOfferType === 'offer' ? 'looking-for' : normalizedOfferType === 'looking-for' ? 'offer' : null;
  if (!oppositeOfferType) {
    return [];
  }

  const candidates = await announcementRepository.findMatchingCandidates({
    userId,
    category: baseAnnouncement.category,
    offerType: getOfferTypeVariants(oppositeOfferType),
  });

  const candidatesWithReputation = await attachReputationScores(candidates as MatchCandidate[]);
  const candidatesWithRatings = await attachUserRatings(candidatesWithReputation as MatchCandidate[]);

  if (shouldLog) {
    const offerTypes = Array.from(new Set(candidates.map((candidate: MatchCandidate) => candidate.offerType)));
    const categories = Array.from(new Set(candidates.map((candidate: MatchCandidate) => candidate.category)));
    console.log('[matches] base announcement:', {
      id: baseAnnouncement.id,
      offerType: baseAnnouncement.offerType,
      category: baseAnnouncement.category,
    });
    console.log('[matches] normalized offer:', normalizedOfferType, 'opposite:', oppositeOfferType);
    console.log('[matches] candidates count:', candidates.length, 'offerTypes:', offerTypes, 'categories:', categories);
  }

  const base = toMatchBase(baseAnnouncement);
  return buildScoredMatches(base, candidatesWithRatings as MatchCandidate[]);
};

export const getUserAnnouncementMatches = async (userId: string) => {
  const baseAnnouncements = await announcementRepository.findActiveAnnouncementsByUserForMatching(userId);
  const shouldLog = process.env.NODE_ENV === 'development';
  if (shouldLog) {
    console.log('[recommendations] base announcements count:', baseAnnouncements.length);
  }
  if (baseAnnouncements.length === 0) {
    return [];
  }

  const bestByCandidateId = new Map<string, MatchCandidate & WeightedScore>();

  for (const baseAnnouncement of baseAnnouncements) {
    const normalizedOfferType = normalizeOfferTypeForMatch(baseAnnouncement.offerType);
    const oppositeOfferType = normalizedOfferType === 'offer' ? 'looking-for' : normalizedOfferType === 'looking-for' ? 'offer' : null;
    if (!oppositeOfferType) {
      continue;
    }

    const candidates = await announcementRepository.findMatchingCandidates({
      userId,
      category: baseAnnouncement.category,
      offerType: getOfferTypeVariants(oppositeOfferType),
    });

    const candidatesWithReputation = await attachReputationScores(candidates as MatchCandidate[]);
    const candidatesWithRatings = await attachUserRatings(candidatesWithReputation as MatchCandidate[]);

    if (shouldLog) {
      const offerTypes = Array.from(new Set(candidates.map((candidate: MatchCandidate) => candidate.offerType)));
      const categories = Array.from(new Set(candidates.map((candidate: MatchCandidate) => candidate.category)));
      console.log('[recommendations] base announcement:', {
        id: (baseAnnouncement as any).id,
        offerType: baseAnnouncement.offerType,
        category: baseAnnouncement.category,
      });
      console.log('[recommendations] normalized offer:', normalizedOfferType, 'opposite:', oppositeOfferType);
      console.log('[recommendations] candidates count:', candidates.length, 'offerTypes:', offerTypes, 'categories:', categories);
    }

    const base = toMatchBase(baseAnnouncement);
    const scored = buildScoredMatches(base, candidatesWithRatings as MatchCandidate[]);

    for (const match of scored) {
      const existing = bestByCandidateId.get(match.id);
      if (!existing || match.score > existing.score) {
        bestByCandidateId.set(match.id, match);
      }
    }
  }

  return Array.from(bestByCandidateId.values()).sort((a, b) => b.score - a.score);
};
