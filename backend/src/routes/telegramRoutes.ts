import { Router } from 'express';
import { TelegramController } from '../controllers/telegramController';
import { verifyTelegramWebhookSecret } from '../middleware/webhookAuth';

const router = Router();

// Telegram Webhook endpoint - verified by secret token header
router.post('/webhook', verifyTelegramWebhookSecret, TelegramController.handleWebhook);

export default router;
