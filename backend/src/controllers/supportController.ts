import { Request, Response } from 'express';
import { z } from 'zod';
import { SupportStatus } from '@prisma/client';
import { SupportService } from '../services/supportService';
import { sendError, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { logAdminAction } from '../middleware/auditLogger';

export const getSupportQuerySchema = z.object({
  status: z.nativeEnum(SupportStatus).optional(),
  search: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(15),
});

export const replySupportSchema = z.object({
  content: z.string().min(1, 'Reply message cannot be empty'),
});

export const updateSupportStatusSchema = z.object({
  status: z.nativeEnum(SupportStatus),
});

export class SupportController {
  static async getConversations(req: Request, res: Response) {
    const { status, search, page, limit } = req.query as any;
    const result = await SupportService.getConversations({
      status,
      search,
      page: Number(page) || 1,
      limit: Number(limit) || 15,
    });

    return sendPaginated(
      res,
      result.conversations,
      result.total,
      result.page,
      result.limit,
      'Support conversations retrieved successfully'
    );
  }

  static async getConversationById(req: Request, res: Response) {
    const { id } = req.params;
    const conversation = await SupportService.getConversationById(id);

    if (!conversation) {
      return sendError(res, 'Conversation not found', 404);
    }

    return sendSuccess(res, conversation, 'Conversation details retrieved');
  }

  static async replyToConversation(req: Request, res: Response) {
    const { id } = req.params;
    const { content } = req.body;
    const adminId = req.admin?.id || 'admin';

    try {
      const message = await SupportService.replyToConversation(id, adminId, content);
      await logAdminAction(req, 'REPLY_SUPPORT', 'SupportConversation', id, { contentLength: content.length });
      return sendSuccess(res, message, 'Reply sent to user successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await SupportService.updateConversationStatus(id, status);
    await logAdminAction(req, 'UPDATE_SUPPORT_STATUS', 'SupportConversation', id, { status });

    return sendSuccess(res, updated, 'Conversation status updated');
  }
}
