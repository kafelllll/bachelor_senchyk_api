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

type PlantIdIdentifyParams = {
  imageBase64?: string;
  images?: string[];
  similarImages?: boolean;
  latitude?: number;
  longitude?: number;
  datetime?: string;
  customId?: number;
  health?: 'only' | 'auto' | 'all';
  diseaseLevel?: 'all' | 'general';
  classificationLevel?: 'species' | 'all' | 'genus';
  classificationRaw?: boolean;
  symptoms?: boolean;
  suggestionFilter?: {
    classification: string;
  };
  modifiers?: string[];
};

export class PlantIdRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super('Plant.id request failed');
    this.status = status;
    this.body = body;
  }
}

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

const getPlantIdConfig = () => {
  const apiKey = process.env.PLANT_ID_API_KEY;
  if (!apiKey) {
    throw new Error('PLANT_ID_API_KEY is not set');
  }
  const baseUrl = process.env.PLANT_ID_BASE_URL || 'https://plant.id/api/v3/identification';
  const authHeader = process.env.PLANT_ID_AUTH_HEADER || 'Api-Key';
  const authScheme = process.env.PLANT_ID_AUTH_SCHEME || '';
  const authValue = authScheme ? `${authScheme} ${apiKey}` : apiKey;
  return {
    apiKey,
    baseUrl,
    authHeader,
    authValue,
  };
};

const stripDataUrl = (value: string): string => {
  const match = value.match(/^data:.*;base64,(.*)$/);
  return match?.[1] ?? value;
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

export const identifyPlantByImage = async (params: PlantIdIdentifyParams): Promise<unknown> => {
  const { baseUrl, authHeader, authValue } = getPlantIdConfig();
  const images = (params.images && params.images.length > 0 ? params.images : params.imageBase64 ? [params.imageBase64] : [])
    .map(stripDataUrl)
    .filter((image) => image.length > 0);

  if (images.length === 0) {
    throw new Error('No images provided');
  }

  let similarImages = params.similarImages;
  const rawModifiers = params.modifiers ?? [];
  if (typeof similarImages !== 'boolean') {
    if (rawModifiers.includes('similar_images=true') || rawModifiers.includes('similar_images')) {
      similarImages = true;
    }
    if (rawModifiers.includes('similar_images=false')) {
      similarImages = false;
    }
  }
  const normalizedModifiers = rawModifiers
    .filter((modifier) => modifier.includes('='))
    .filter((modifier) => !modifier.startsWith('similar_images='));
  const payload = {
    images,
    ...(typeof similarImages === 'boolean' ? { similar_images: similarImages } : {}),
    ...(typeof params.latitude === 'number' ? { latitude: params.latitude } : {}),
    ...(typeof params.longitude === 'number' ? { longitude: params.longitude } : {}),
    ...(params.datetime ? { datetime: params.datetime } : {}),
    ...(typeof params.customId === 'number' ? { custom_id: params.customId } : {}),
    ...(params.health ? { health: params.health } : {}),
    ...(params.diseaseLevel ? { disease_level: params.diseaseLevel } : {}),
    ...(params.classificationLevel ? { classification_level: params.classificationLevel } : {}),
    ...(typeof params.classificationRaw === 'boolean' ? { classification_raw: params.classificationRaw } : {}),
    ...(typeof params.symptoms === 'boolean' ? { symptoms: params.symptoms } : {}),
    ...(params.suggestionFilter ? { suggestion_filter: params.suggestionFilter } : {}),
    ...(normalizedModifiers.length > 0 ? { modifiers: normalizedModifiers } : {}),
  };

  const response = await fetch(baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [authHeader]: authValue,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new PlantIdRequestError(response.status, body);
  }

  return (await response.json()) as unknown;
};
