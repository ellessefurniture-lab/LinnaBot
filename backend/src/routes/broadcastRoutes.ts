import { Router } from 'express';
import {
  BroadcastController,
  createBroadcastSchema,
  getBroadcastsQuerySchema,
} from '../controllers/broadcastController';
import { authenticateAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticateAdmin);

router.get('/estimate-target', BroadcastController.estimateAudience);
router.get('/', validateRequest({ query: getBroadcastsQuerySchema }), BroadcastController.getBroadcasts);
router.post('/', validateRequest({ body: createBroadcastSchema }), BroadcastController.createBroadcast);
router.get('/:id', BroadcastController.getBroadcastById);
router.post('/:id/cancel', BroadcastController.cancelBroadcast);

export default router;
