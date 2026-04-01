import { z } from 'zod';
import { createAnnouncementSchema, updateAnnouncementSchema } from '../validations/announcement.validation.js';

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>['body'];
