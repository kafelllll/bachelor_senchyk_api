import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createMessage, getConversations, getMessages, deleteConversation, getUnreadCount } from '../controllers/message.controller.js';
import { createMessageSchema, getConversationsSchema, getMessagesSchema, deleteConversationSchema } from '../validations/message.validation.js';

const router = Router();

router.post('/', authenticate, validate(createMessageSchema), createMessage);
router.get('/', authenticate, validate(getMessagesSchema), getMessages);
router.get('/conversations', authenticate, validate(getConversationsSchema), getConversations);
router.get('/unread-count', authenticate, getUnreadCount);
router.delete('/', authenticate, validate(deleteConversationSchema), deleteConversation);
export default router;
