import { Router } from 'express';
import { AuthController, loginSchema } from '../controllers/authController';
import { validateRequest } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimiter';
import { authenticateAdmin } from '../middleware/auth';

const router = Router();

router.post('/login', authLimiter, validateRequest({ body: loginSchema }), AuthController.login);
router.post('/logout', authenticateAdmin, AuthController.logout);
router.get('/me', authenticateAdmin, AuthController.me);

export default router;
