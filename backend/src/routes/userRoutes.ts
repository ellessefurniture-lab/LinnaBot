import { Router } from 'express';
import {
  UserController,
  getUsersQuerySchema,
  updateUserStatusSchema,
} from '../controllers/userController';
import { authenticateAdmin } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';

const router = Router();

router.use(authenticateAdmin);

router.get('/', validateRequest({ query: getUsersQuerySchema }), UserController.getUsers);
router.get('/:id', UserController.getUserById);
router.patch('/:id', validateRequest({ body: updateUserStatusSchema }), UserController.updateUser);
router.delete('/:id', UserController.deleteUser);

export default router;
