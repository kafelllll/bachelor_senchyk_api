import { fetch as undiciFetch } from 'undici';

type DeepLTranslation = {
  text: string;
};

type DeepLResponse = {
  translations?: DeepLTranslation[];
};

export class TranslationRequestError extends Error {
  status: number;
  body: string;

  constructor(status: number, body: string) {
    super('Translation request failed');
    this.status = status;
    this.body = body;
  }
}

const httpFetch: typeof fetch = globalThis.fetch ?? undiciFetch;

const getDeepLConfig = () => {
  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPL_API_KEY is not set');
  }
  const baseUrl = process.env.DEEPL_BASE_URL || 'https://api-free.deepl.com/v2/translate';
  return { apiKey, baseUrl };
};

export const translateTexts = async (
  texts: string[],
  targetLang: 'EN' | 'UK',
  sourceLang?: 'EN' | 'UK',
): Promise<string[]> => {
  if (texts.length === 0) {
    return [];
  }
  const { apiKey, baseUrl } = getDeepLConfig();
  const response = await httpFetch(baseUrl, {
    method: 'POST',
    headers: {
      Authorization: `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      target_lang: targetLang,
      ...(sourceLang ? { source_lang: sourceLang } : {}),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new TranslationRequestError(response.status, body);
  }

  const payload = (await response.json()) as DeepLResponse;
  const translations = Array.isArray(payload?.translations) ? payload.translations : [];
  return texts.map((value, index) => translations[index]?.text ?? value);
};

export const translateText = async (
  text: string,
  targetLang: 'EN' | 'UK',
  sourceLang?: 'EN' | 'UK',
): Promise<string> => {
  const [translated] = await translateTexts([text], targetLang, sourceLang);
  return translated ?? text;
};

type TranslationPath = Array<string | number>;

const isSkippableString = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return true;
  }
  if (/^data:/i.test(trimmed)) {
    return true;
  }
  return false;
};

const collectTranslatableStrings = (
  value: unknown,
  path: TranslationPath,
  entries: Array<{ path: TranslationPath; value: string }>,
): void => {
  if (typeof value === 'string') {
    if (!isSkippableString(value)) {
      entries.push({ path, value });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTranslatableStrings(item, [...path, index], entries));
    return;
  }
  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      collectTranslatableStrings(item, [...path, key], entries);
    });
  }
};

const cloneValue = (value: unknown): any => {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).reduce<Record<string, unknown>>((acc, [key, item]) => {
      acc[key] = cloneValue(item);
      return acc;
    }, {});
  }
  return value;
};

const setValueAtPath = (value: any, path: TranslationPath, translated: string): void => {
  if (path.length === 0) {
    return;
  }
  let cursor = value;
  for (let index = 0; index < path.length - 1; index += 1) {
    const key = path[index] as string | number;
    cursor = (cursor as Record<string | number, unknown>)[key];
  }
  const lastKey = path[path.length - 1] as string | number;
  (cursor as Record<string | number, unknown>)[lastKey] = translated;
};

const hasLatinChars = (value: string): boolean => /[A-Za-z]/.test(value);

const transliterateLatinToUkrainian = (value: string): string => {
  const replacements: Array<[RegExp, string]> = [
    [/sch/gi, 'щ'],
    [/shch/gi, 'щ'],
    [/zh/gi, 'ж'],
    [/kh/gi, 'х'],
    [/ts/gi, 'ц'],
    [/ch/gi, 'ч'],
    [/sh/gi, 'ш'],
    [/yu/gi, 'ю'],
    [/ya/gi, 'я'],
    [/ye/gi, 'є'],
    [/yi/gi, 'ї'],
    [/yo/gi, 'йо'],
    [/ph/gi, 'ф'],
    [/th/gi, 'т'],
    [/ck/gi, 'к'],
    [/qu/gi, 'кв'],
  ];
  const map: Record<string, string> = {
    a: 'а', b: 'б', c: 'к', d: 'д', e: 'е', f: 'ф', g: 'г', h: 'х', i: 'і', j: 'й',
    k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'к', r: 'р', s: 'с', t: 'т',
    u: 'у', v: 'в', w: 'в', x: 'кс', y: 'і', z: 'з',
  };

  let output = value;
  replacements.forEach(([pattern, replacement]) => {
    output = output.replace(pattern, (match) => {
      const isUpper = match === match.toUpperCase();
      if (!isUpper) {
        return replacement;
      }
      return replacement.toUpperCase();
    });
  });

  output = output.replace(/[A-Za-z]/g, (match) => {
    const lower = match.toLowerCase();
    const mapped = map[lower];
    if (!mapped) {
      return match;
    }
    if (match === lower) {
      return mapped;
    }
    return mapped.charAt(0).toUpperCase() + mapped.slice(1);
  });

  return output;
};

const transliterateOutsideParentheses = (value: string): string => {
  const parts: string[] = [];
  const regex = /\([^)]*\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(value)) !== null) {
    if (match.index > lastIndex) {
      const outside = value.slice(lastIndex, match.index);
      parts.push(transliterateLatinToUkrainian(outside));
    }
    parts.push(match[0]);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < value.length) {
    parts.push(transliterateLatinToUkrainian(value.slice(lastIndex)));
  }

  return parts.join('');
};

export const translateObjectStrings = async <T>(
  value: T,
  targetLang: 'EN' | 'UK',
  sourceLang?: 'EN' | 'UK',
): Promise<T> => {
  const entries: Array<{ path: TranslationPath; value: string }> = [];
  collectTranslatableStrings(value, [], entries);
  if (entries.length === 0) {
    return value;
  }
  const texts = entries.map((entry) => entry.value);
  const translated = await translateTexts(texts, targetLang, sourceLang);
  const cloned = cloneValue(value);
  entries.forEach((entry, index) => {
    const translatedValue = translated[index];
    if (typeof translatedValue === 'string' && translatedValue.trim()) {
      const normalized = hasLatinChars(translatedValue)
        ? transliterateOutsideParentheses(translatedValue)
        : translatedValue;
      setValueAtPath(cloned, entry.path, normalized);
    }
  });
  return cloned;
};
