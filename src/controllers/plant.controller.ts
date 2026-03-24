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
