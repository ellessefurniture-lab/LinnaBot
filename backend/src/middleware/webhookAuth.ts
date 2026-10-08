import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export const verifyTelegramWebhookSecret = (
  req: Request,
  res: Response,
  next: NextFunction
): any => {
  // If webhook secret is configured and in production or test
  if (config.TELEGRAM_WEBHOOK_SECRET) {
    const headerSecret = req.headers['x-telegram-bot-api-secret-token'];
    if (headerSecret !== config.TELEGRAM_WEBHOOK_SECRET) {
      logger.warn(`Unauthorized webhook attempt with secret token: ${headerSecret}`);
      return sendError(res, 'Unauthorized Telegram webhook request', 403);
    }
  }
  return next();
};
