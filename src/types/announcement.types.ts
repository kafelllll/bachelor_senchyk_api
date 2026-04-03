import { createAnnouncementSchema, updateAnnouncementSchema } from '../validations/announcement.validation.js';

export type CreateAnnouncementInput = typeof createAnnouncementSchema.shape.body._type;
export type UpdateAnnouncementInput = typeof updateAnnouncementSchema.shape.body._type;
