import { createAnnouncementSchema, updateAnnouncementSchema, searchAnnouncementSchema } from '../validations/announcement.validation.js';
import type { z } from 'zod';
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>['body'];
export type SearchAnnouncementQuery = z.infer<typeof searchAnnouncementSchema>['query'];
