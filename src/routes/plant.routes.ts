import { Router } from 'express';
import { validate } from '../middlewares/validate.middleware.js';
import { searchPlants } from '../controllers/plant.controller.js';
import { plantSearchSchema } from '../validations/plant.validation.js';

const router = Router();

router.get('/search', validate(plantSearchSchema), searchPlants);

export default router;
