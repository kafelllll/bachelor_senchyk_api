type TreflePlantItem = {
  id: number;
  common_name: string | null;
  scientific_name: string | null;
  genus: string | null;
  family: string | null;
  image_url: string | null;
};

type TreflePlantSearchResult = {
  data: TreflePlantItem[];
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

type CacheEntry = {
  value: TreflePlantSearchResult;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const getTrefleConfig = () => {
  const token = process.env.TREFLE_TOKEN;
  if (!token) {
    throw new Error('TREFLE_TOKEN is not set');
  }
  const baseUrl = process.env.TREFLE_BASE_URL || 'https://trefle.io/api/v1/plants';
  return { token, baseUrl };
};

export const searchPlantsByCommonName = async (commonName: string): Promise<TreflePlantSearchResult> => {
  const normalized = commonName.trim().toLowerCase();
  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { token, baseUrl } = getTrefleConfig();
  const url = `${baseUrl}?token=${token}&filter[common_name]=${encodeURIComponent(commonName)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Trefle request failed');
  }

  const raw = (await response.json()) as TreflePlantSearchResult;
  const shaped: TreflePlantSearchResult = {
    data: (raw.data || []).map((item: any) => ({
      id: item.id,
      common_name: item.common_name ?? null,
      scientific_name: item.scientific_name ?? null,
      genus: item.genus ?? null,
      family: item.family ?? null,
      image_url: item.image_url ?? null,
    })),
    ...(raw.links ? { links: raw.links } : {}),
    ...(raw.meta ? { meta: raw.meta } : {}),
  };

  cache.set(normalized, { value: shaped, expiresAt: Date.now() + CACHE_TTL_MS });
  return shaped;
};
