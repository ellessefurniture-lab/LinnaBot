import { Request, Response } from 'express';
import { botInstance } from '../telegram/bot';
import { logger } from '../utils/logger';
import { sendError, sendSuccess } from '../utils/apiResponse';

export class TelegramController {
  static async handleWebhook(req: Request, res: Response) {
    if (!botInstance) {
      logger.warn('Webhook received but botInstance is null');
      return sendError(res, 'Telegram bot not initialized', 503);
    }

    try {
      await botInstance.handleUpdate(req.body, res);
      // If handleUpdate hasn't responded yet
      if (!res.headersSent) {
        return sendSuccess(res, { ok: true }, 'Update processed');
      }
    } catch (err: any) {
      logger.error('Error handling Telegram webhook update:', err);
      if (!res.headersSent) {
        return sendError(res, 'Failed to process Telegram update', 500);
      }
    }
  }
}
