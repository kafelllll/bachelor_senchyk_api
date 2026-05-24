import { createMessageSchema, getMessagesSchema, getConversationsSchema, deleteConversationSchema } from '../validations/message.validation.js';
import type { z } from 'zod';
export type CreateMessageInput = z.infer<typeof createMessageSchema>['body'];
export type GetMessagesQuery = z.infer<typeof getMessagesSchema>['query'];
export type GetConversationsQuery = z.infer<typeof getConversationsSchema>['query'];
export type DeleteConversationQuery = z.infer<typeof deleteConversationSchema>['query'];
