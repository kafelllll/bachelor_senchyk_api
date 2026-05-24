import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ensureTestDbConfigured, resetDatabase, disconnectDatabase } from '../helpers/db.js';

let app;

const plantServiceMock = {
  searchPlantsByCommonName: jest.fn(),
  identifyPlantByImage: jest.fn(),
  PlantIdRequestError: class PlantIdRequestError extends Error {
    constructor(status, body) {
      super('Plant.id request failed');
      this.status = status;
      this.body = body;
    }
  },
};

const translationServiceMock = {
  translateText: jest.fn(),
  translateObjectStrings: jest.fn(),
  TranslationRequestError: class TranslationRequestError extends Error {
    constructor(status, body) {
      super('Translation request failed');
      this.status = status;
      this.body = body;
    }
  },
};

beforeAll(async () => {
  ensureTestDbConfigured();  jest.unstable_mockModule('../../src/services/email.service.js', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendMessageNotificationEmail: jest.fn().mockResolvedValue(undefined),
    sendExchangeInitiatedEmail: jest.fn().mockResolvedValue(undefined),
    sendRatingNotificationEmail: jest.fn().mockResolvedValue(undefined),
  }));
  jest.unstable_mockModule('../../src/services/plant.service.js', () => plantServiceMock);
  jest.unstable_mockModule('../../src/services/translation.service.js', () => translationServiceMock);

  const { createTestApp } = await import('../helpers/create-test-app.js');
  app = await createTestApp();
});

beforeEach(async () => {
  await resetDatabase();
  jest.clearAllMocks();
});

afterAll(async () => {
  await disconnectDatabase();
});

describe('External integrations API (mocked)', () => {
  it('handles /plants/search via mocked services', async () => {
    translationServiceMock.translateText.mockResolvedValue('Monstera');
    plantServiceMock.searchPlantsByCommonName.mockResolvedValue({
      data: [
        {
          id: 1,
          common_name: 'Монстера',
          scientific_name: 'Monstera deliciosa',
          genus: 'Monstera',
          family: 'Araceae',
        },
      ],
    });
    translationServiceMock.translateObjectStrings.mockResolvedValue([
      {
        id: 1,
        common_name: 'Монстера',
        scientific_name: 'Monstera deliciosa',
        genus: 'Monstera',
        family: 'Araceae',
      },
    ]);

    const res = await request(app).get('/plants/search').query({ commonName: 'Монстера' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.primary).toBeTruthy();
  });

  it('handles /plants/identify via mocked services', async () => {
    plantServiceMock.identifyPlantByImage.mockResolvedValue({
      result: { classification: { suggestions: [] } },
    });
    translationServiceMock.translateObjectStrings.mockResolvedValue({
      result: { classification: { suggestions: [] } },
    });

    const res = await request(app)
      .post('/plants/identify')
      .send({ imageBase64: 'data:image/png;base64,AAAA' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('validates upload presigned-url request and config', async () => {
    const badType = await request(app).post('/api/uploads/presigned-url').send({
      fileName: 'test.gif',
      fileType: 'image/gif',
    });
    expect(badType.status).toBe(400);

    const oldBucket = process.env.AWS_S3_BUCKET_NAME;
    const oldBase = process.env.AWS_S3_PUBLIC_BASE_URL;
    delete process.env.AWS_S3_BUCKET_NAME;
    delete process.env.AWS_S3_PUBLIC_BASE_URL;

    const missingConfig = await request(app).post('/api/uploads/presigned-url').send({
      fileName: 'test.jpg',
      fileType: 'image/jpeg',
    });

    expect(missingConfig.status).toBe(500);

    process.env.AWS_S3_BUCKET_NAME = oldBucket;
    process.env.AWS_S3_PUBLIC_BASE_URL = oldBase;
  });
});
