import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const loadPlantService = async (fetchImpl) => {
  jest.resetModules();
  global.fetch = fetchImpl;
  return import('../../src/services/plant.service.js');
};

describe('plant.service unit', () => {
  beforeEach(() => {
    process.env.PLANTNET_API_KEY = 'plantnet-key';
    process.env.PLANTNET_BASE_URL = 'https://plantnet.test/v2/species';
    process.env.PLANTNET_LANG = 'en';
    process.env.PLANTNET_TYPE = 'kt';
    process.env.PLANTNET_PAGE_SIZE = '10';
    process.env.PLANTNET_PAGE = '1';
    process.env.PLANT_ID_API_KEY = 'plantid-key';
    process.env.PLANT_ID_BASE_URL = 'https://plantid.test/identify';
    process.env.PLANT_ID_AUTH_HEADER = 'Api-Key';
    process.env.PLANT_ID_AUTH_SCHEME = '';
  });

  it('searches plant by common name and maps result fields', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          species: {
            id: 10,
            commonNames: ['Rubber plant'],
            scientificName: 'Ficus elastica',
            genus: { scientificName: 'Ficus' },
            family: { scientificName: 'Moraceae' },
            images: [{ url: { o: 'https://img.test/ficus.jpg' } }],
          },
        },
      ],
    });

    const service = await loadPlantService(fetchMock);
    const result = await service.searchPlantsByCommonName('Rubber plant');

    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({
      common_name: 'Rubber plant',
      scientific_name: 'Ficus elastica',
      genus: 'Ficus',
      family: 'Moraceae',
    });
  });

  it('identifies plant from base64 image', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: 'ok' }),
    });

    const service = await loadPlantService(fetchMock);
    const result = await service.identifyPlantByImage({ imageBase64: 'data:image/png;base64,aaaa' });

    expect(result).toEqual({ result: 'ok' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://plantid.test/identify',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('throws on identify without images', async () => {
    const fetchMock = jest.fn();
    const service = await loadPlantService(fetchMock);

    await expect(service.identifyPlantByImage({})).rejects.toThrow('No images provided');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
