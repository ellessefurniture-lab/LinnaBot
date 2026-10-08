import { Router } from 'express';
import {
  SupportController,
  getSupportQuerySchema,
  replySupportSchema,
  updateSupportStatusSchema,
} from '../controllers/supportController';
import { authenticateAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticateAdmin);

router.get('/', validateRequest({ query: getSupportQuerySchema }), SupportController.getConversations);
router.get('/:id', SupportController.getConversationById);
router.post('/:id/reply', validateRequest({ body: replySupportSchema }), SupportController.replyToConversation);
router.patch('/:id/status', validateRequest({ body: updateSupportStatusSchema }), SupportController.updateStatus);

export default router;
