import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateAdmin);

router.get('/stats', DashboardController.getStats);

export default router;
