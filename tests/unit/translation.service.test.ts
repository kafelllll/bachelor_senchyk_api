import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const loadTranslationService = async (fetchImpl) => {
  jest.resetModules();
  global.fetch = fetchImpl;
  return import('../../src/services/translation.service.js');
};

describe('translation.service unit', () => {
  beforeEach(() => {
    process.env.DEEPL_API_KEY = 'test-key';
    process.env.DEEPL_BASE_URL = 'https://deepl.test/translate';
  });

  it('translates text successfully', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ translations: [{ text: 'Привіт' }] }),
    });

    const service = await loadTranslationService(fetchMock);
    const result = await service.translateText('Hello', 'UK', 'EN');

    expect(result).toBe('Привіт');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://deepl.test/translate',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws TranslationRequestError on non-2xx response', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => 'too many requests',
    });

    const service = await loadTranslationService(fetchMock);

    await expect(service.translateText('Hello', 'UK', 'EN')).rejects.toMatchObject({
      status: 429,
      body: 'too many requests',
    });
  });
});
