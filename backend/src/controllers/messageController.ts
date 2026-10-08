import { Request, Response } from 'express';
import { z } from 'zod';
import { MessageDirection, MessageType } from '@prisma/client';
import { MessageService } from '../services/messageService';
import { sendPaginated, sendSuccess } from '../utils/apiResponse';

export const getMessagesQuerySchema = z.object({
  search: z.string().optional(),
  direction: z.nativeEnum(MessageDirection).optional(),
  messageType: z.nativeEnum(MessageType).optional(),
  userId: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export class MessageController {
  static async getMessages(req: Request, res: Response) {
    const { search, direction, messageType, userId, page, limit } = req.query as any;
    const result = await MessageService.getMessages({
      search,
      direction,
      messageType,
      userId,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });

    return sendPaginated(
      res,
      result.messages,
      result.total,
      result.page,
      result.limit,
      'Messages retrieved successfully'
    );
  }

  static async getMessageStats(req: Request, res: Response) {
    const stats = await MessageService.getMessageStats();
    return sendSuccess(res, stats, 'Message statistics retrieved');
  }
}
