import type { Request, Response } from 'express';
import * as plantService from '../services/plant.service.js';

export const searchPlants = async (req: Request, res: Response): Promise<void> => {
  try {
    const commonName = req.query.commonName as string;
    const result = await plantService.searchPlantsByCommonName(commonName);
    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    if (error.message === 'TREFLE_TOKEN is not set') {
      res.status(500).json({ success: false, message: 'Server misconfiguration' });
      return;
    }
    res.status(502).json({ success: false, message: 'Upstream error' });
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

    res.status(200).json({ success: true, result });
  } catch (error: any) {
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
    res.status(502).json({ success: false, message: 'Upstream error' });
  }
};
