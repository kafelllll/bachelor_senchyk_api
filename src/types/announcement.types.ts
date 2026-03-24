import { z } from 'zod';
import { createAnnouncementSchema } from '../validations/announcement.validation.js';

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
