import { Router } from 'express';
import { MessageController, getMessagesQuerySchema } from '../controllers/messageController';
import { authenticateAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticateAdmin);

router.get('/', validateRequest({ query: getMessagesQuerySchema }), MessageController.getMessages);
router.get('/stats', MessageController.getMessageStats);

export default router;
