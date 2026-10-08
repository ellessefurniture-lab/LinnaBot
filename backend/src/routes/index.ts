import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import broadcastRoutes from './broadcastRoutes';
import messageRoutes from './messageRoutes';
import supportRoutes from './supportRoutes';
import settingsRoutes from './settingsRoutes';
import dashboardRoutes from './dashboardRoutes';
import telegramRoutes from './telegramRoutes';
import auditLogRoutes from './auditLogRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/broadcasts', broadcastRoutes);
router.use('/messages', messageRoutes);
router.use('/support', supportRoutes);
router.use('/settings', settingsRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/telegram', telegramRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
