import { Router } from 'express';
import { SettingsController, updateSettingsSchema } from '../controllers/settingsController';
import { authenticateAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticateAdmin);

router.get('/', SettingsController.getSettings);
router.patch('/', validateRequest({ body: updateSettingsSchema }), SettingsController.updateSettings);

export default router;
