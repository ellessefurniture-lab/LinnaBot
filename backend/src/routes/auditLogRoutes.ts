import { Router } from 'express';
import { AuditLogController } from '../controllers/auditLogController';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

router.use(authenticateAdmin);

router.get('/', AuditLogController.getLogs);

export default router;
