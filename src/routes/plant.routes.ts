import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { identifyPlant, searchPlants } from '../controllers/plant.controller.js';
import { plantIdentifySchema, plantSearchSchema } from '../validations/plant.validation.js';

const router = Router();

router.get('/search', validate(plantSearchSchema), searchPlants);
router.post('/identify', validate(plantIdentifySchema), identifyPlant);

export default router;
