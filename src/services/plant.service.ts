import { fetch as undiciFetch } from 'undici';

const httpFetch: typeof fetch = globalThis.fetch ?? undiciFetch;

type PlantNetPlantItem = {
  id: number | string;
  common_name: string | null;
  scientific_name: string | null;
  genus: string | null;
  family: string | null;
  image_url: string | null;
};

type PlantNetPlantSearchResult = {
  data: PlantNetPlantItem[];
  links?: Record<string, unknown>;
  meta?: Record<string, unknown>;
};

type CacheEntry = {
  value: PlantNetPlantSearchResult;
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

export class PlantNetRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super('PlantNet request failed');
    this.status = status;
    this.body = body;
  }
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const commonNameAliases: Record<string, string> = {
  'snake plant': 'dracaena trifasciata',
  'mother-in-law\'s tongue': 'dracaena trifasciata',
  'sansevieria': 'dracaena trifasciata',
};

const transliterateUkToLatin = (value: string): string => {
  const map: Record<string, string> = {
    а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'y',
    і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch',
    ь: '', ю: 'yu', я: 'ya',
  };

  return value
    .trim()
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const mapped = map[lower];
      if (!mapped) {
        return char;
      }
      return char === lower ? mapped : mapped.charAt(0).toUpperCase() + mapped.slice(1);
    })
    .join('');
};

const getPlantNetConfig = () => {
  const apiKey = process.env.PLANTNET_API_KEY;
  if (!apiKey) {
    throw new Error('PLANTNET_API_KEY is not set');
  }
  const baseUrl = process.env.PLANTNET_BASE_URL || 'https://my-api.plantnet.org/v2/species';
  const lang = process.env.PLANTNET_LANG || 'en';
  const type = process.env.PLANTNET_TYPE || 'kt';
  const pageSize = process.env.PLANTNET_PAGE_SIZE || '100';
  const page = process.env.PLANTNET_PAGE || '1';
  const includeImages = process.env.PLANTNET_INCLUDE_IMAGES === 'true';
  return { apiKey, baseUrl, lang, type, pageSize, page, includeImages };
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

export const searchPlantsByCommonName = async (commonName: string): Promise<PlantNetPlantSearchResult> => {
  const normalized = commonName.trim().toLowerCase();
  const cached = cache.get(normalized);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const { apiKey, baseUrl, lang, type, pageSize, page, includeImages } = getPlantNetConfig();
  const alignBaseUrl = baseUrl.replace('/v2/species', '/v2/projects/useful/species/align');
  const aliasScientific = commonNameAliases[normalized];
  const fetchSpecies = async (prefix: string, langValue: string): Promise<any[]> => {
    const params = new URLSearchParams({
      lang: langValue,
      type,
      pageSize,
      page,
      prefix,
      'api-key': apiKey,
    });
    if (includeImages) {
      params.set('images', 'true');
    }
    const url = `${baseUrl}?${params.toString()}`;
    const response = await httpFetch(url);
    if (!response.ok) {
      const body = await response.text();
      throw new PlantNetRequestError(response.status, body);
    }
    const raw = (await response.json()) as any;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (Array.isArray(raw?.data)) {
      return raw.data;
    }
    if (Array.isArray(raw?.results)) {
      return raw.results;
    }
    if (Array.isArray(raw?.items)) {
      return raw.items;
    }
    return [];
  };
  const fetchSpeciesBySynonym = async (name: string): Promise<any[]> => {
    const params = new URLSearchParams({
      name,
      authorship: 'false',
      synonyms: 'true',
      'api-key': apiKey,
    });
    const url = `${alignBaseUrl}?${params.toString()}`;
    const response = await httpFetch(url);
    if (!response.ok) {
      const body = await response.text();
      if (response.status === 403 && body.includes('align')) {
        return [];
      }
      throw new PlantNetRequestError(response.status, body);
    }
    const raw = (await response.json()) as any;
    if (Array.isArray(raw)) {
      return raw;
    }
    if (Array.isArray(raw?.data)) {
      return raw.data;
    }
    return [];
  };

  const transliterated = transliterateUkToLatin(commonName);
  const normalizedInput = commonName.trim();
  const normalizedLower = normalizedInput.toLowerCase();
  const firstToken = normalizedInput.split(/\s+/)[0] || normalizedInput;
  const firstTokenLower = firstToken.toLowerCase();
  const transliteratedFirstToken = transliterated.split(/\s+/)[0] || transliterated;
  const scientificInput = aliasScientific ?? '';
  const scientificFirstToken = scientificInput.split(/\s+/)[0] || scientificInput;
  const prefixes = Array.from(
    new Set([
      normalizedInput,
      normalizedLower,
      transliterated,
      scientificInput,
      firstToken,
      firstTokenLower,
      transliteratedFirstToken,
      transliteratedFirstToken.toLowerCase(),
      scientificFirstToken,
      scientificFirstToken.toLowerCase(),
      transliterated.slice(0, 3),
    ].filter((value) => value && value.trim().length > 0)),
  );

  let rawData: any[] = [];
  for (const prefix of prefixes) {
    rawData = await fetchSpecies(prefix, lang);
    if (rawData.length > 0) {
      break;
    }
  }
  if (rawData.length === 0) {
    rawData = await fetchSpeciesBySynonym(commonName);
  }
  const finalNormalized = aliasScientific ? aliasScientific.toLowerCase() : normalizedLower;
  const inputValue = finalNormalized || commonName.trim().toLowerCase();
  const scored = rawData.map((item: any, index: number) => {
      const species = item?.species ?? item;
      const commonNames = Array.isArray(species?.commonNames) ? species.commonNames : [];
      const matchedCommon = commonNames.find((name: string) => name.toLowerCase() === inputValue) ??
        commonNames.find((name: string) => name.toLowerCase().includes(inputValue)) ??
        null;
      const commonNameValue = matchedCommon ?? (commonNames.length > 0 ? commonNames[0] : species?.commonName ?? null);
      const genusValue = species?.genus?.scientificName ?? species?.genus ?? species?.genusName ?? null;
      const familyValue = species?.family?.scientificName ?? species?.family ?? species?.familyName ?? null;
      const imageUrl = species?.images?.[0]?.url ?? item?.images?.[0]?.url ?? null;
      const imageValue =
        imageUrl?.o ??
        imageUrl?.m ??
        imageUrl?.s ??
        species?.image?.url ??
        item?.image?.url ??
        null;

      return {
        id: species?.id ?? species?.key ?? species?.speciesId ?? index,
        common_name: commonNameValue,
        scientific_name:
          species?.scientificNameWithoutAuthor ??
          species?.scientificName ??
          species?.scientific_name ??
          null,
        genus: genusValue,
        family: familyValue,
        image_url: imageValue,
      };
    });

  const ranked = scored
    .filter((item) => {
      if (!inputValue) {
        return true;
      }
      const candidates = [item.common_name, item.scientific_name]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());
      return candidates.some((value) => value === inputValue || value.includes(inputValue));
    })
    .sort((a, b) => {
      const score = (value: string | null): number => {
        if (!inputValue || !value) {
          return 0;
        }
        const lower = value.toLowerCase();
        if (lower === inputValue) {
          return 3;
        }
        if (lower.startsWith(inputValue)) {
          return 2;
        }
        if (lower.includes(inputValue)) {
          return 1;
        }
        return 0;
      };
      const aScore = Math.max(score(a.common_name), score(a.scientific_name));
      const bScore = Math.max(score(b.common_name), score(b.scientific_name));
      return bScore - aScore;
    });

  const shaped: PlantNetPlantSearchResult = {
    data: ranked,
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

  const response = await httpFetch(baseUrl, {
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
