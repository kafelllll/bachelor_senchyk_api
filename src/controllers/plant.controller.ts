import type { Request, Response } from 'express';
import * as plantService from '../services/plant.service.js';
import * as translationService from '../services/translation.service.js';

const hasUkrainianChars = (value: string): boolean => /[А-ЩЬЮЯЄІЇҐа-щьюяєіїґ]/.test(value);

const removeFamilyFields = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => removeFamilyFields(item)) as T;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.entries(record).reduce<Record<string, unknown>>((acc, [key, item]) => {
      if (key === 'family') {
        return acc;
      }
      acc[key] = removeFamilyFields(item);
      return acc;
    }, {}) as T;
  }
  return value;
};


export const searchPlants = async (req: Request, res: Response): Promise<void> => {
  const commonName = (req.query.commonName as string) || (req.query.name as string);
  if (!commonName || !commonName.trim()) {
    res.status(400).json({ success: false, message: 'commonName or name is required' });
    return;
  }

  try {
    const translatedQuery = hasUkrainianChars(commonName)
      ? await translationService.translateText(commonName, 'EN', 'UK')
      : commonName;
    const result = await plantService.searchPlantsByCommonName(translatedQuery);
    const translatedData = await translationService.translateObjectStrings(result.data, 'UK', 'EN');
    const filteredData = removeFamilyFields(translatedData);
    const translatedResult = { ...result, data: filteredData };
    const translatedArray = Array.isArray(filteredData) ? filteredData : [];
    const primary = translatedArray[0] ?? null;
    const suggestions = translatedArray.slice(1, 4);
    res.status(200).json({ success: true, primary, suggestions, ...translatedResult });
  } catch (error: any) {
    if (error.message === 'DEEPL_API_KEY is not set') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
      return;
    }
    if (error.message === 'PLANTNET_API_KEY is not set') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
      return;
    }
    if (error instanceof translationService.TranslationRequestError) {
      const status = typeof error?.status === 'number' ? error.status : 502;
      res.status(status).json({
        success: false,
        message: 'Translation service error',
        details: error.body,
      });
      return;
    }
    const status = typeof error?.status === 'number' ? error.status : 500;
    const details = typeof error?.body === 'string' ? error.body : undefined;
    res.status(status).json({
      success: false,
      message: error?.message || 'Unexpected error',
      ...(details ? { details } : {}),
    });
  }
};

export const identifyPlant = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      imageBase64,
      images,
      similarImages,
      latitude,
      longitude,
      datetime,
      customId,
      health,
      diseaseLevel,
      classificationLevel,
      classificationRaw,
      symptoms,
      suggestionFilter,
      modifiers,
    } = req.body as {
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

    const params = {
      ...(imageBase64 ? { imageBase64 } : {}),
      ...(images ? { images } : {}),
      ...(typeof similarImages === 'boolean' ? { similarImages } : {}),
      ...(typeof latitude === 'number' ? { latitude } : {}),
      ...(typeof longitude === 'number' ? { longitude } : {}),
      ...(datetime ? { datetime } : {}),
      ...(typeof customId === 'number' ? { customId } : {}),
      ...(health ? { health } : {}),
      ...(diseaseLevel ? { diseaseLevel } : {}),
      ...(classificationLevel ? { classificationLevel } : {}),
      ...(typeof classificationRaw === 'boolean' ? { classificationRaw } : {}),
      ...(typeof symptoms === 'boolean' ? { symptoms } : {}),
      ...(suggestionFilter ? { suggestionFilter } : {}),
      ...(modifiers ? { modifiers } : {}),
    };

    const result = await plantService.identifyPlantByImage(params);
    const translatedResult = await translationService.translateObjectStrings(result, 'UK', 'EN');
    const filteredResult = removeFamilyFields(translatedResult);

    res.status(200).json({ success: true, result: filteredResult });
  } catch (error: any) {
    if (error.message === 'DEEPL_API_KEY is not set') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
      return;
    }
    if (error.message === 'PLANT_ID_API_KEY is not set') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
      return;
    }
    if (error instanceof plantService.PlantIdRequestError) {
      res.status(error.status).json({
        success: false,
        message: 'Plant.id request failed',
        details: error.body,
      });
      return;
    }
    if (error.message === 'No images provided') {
      res.status(400).json({ success: false, message: error.message });
      return;
    }
    if (error instanceof translationService.TranslationRequestError) {
      const status = typeof error?.status === 'number' ? error.status : 502;
      res.status(status).json({
        success: false,
        message: 'Translation service error',
        details: error.body,
      });
      return;
    }
    res.status(500).json({ success: false, message: 'Unexpected error' });
  }
};
