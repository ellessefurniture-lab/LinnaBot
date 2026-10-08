import { Request, Response } from 'express';
import { z } from 'zod';
import { BroadcastStatus, MediaType, ParseMode, TargetAudience } from '@prisma/client';
import { BroadcastService } from '../services/broadcastService';
import { sendError, sendPaginated, sendSuccess } from '../utils/apiResponse';
import { logAdminAction } from '../middleware/auditLogger';

export const createBroadcastSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  mediaType: z.nativeEnum(MediaType).default(MediaType.NONE),
  mediaUrl: z.string().url('Invalid media URL').optional().nullable(),
  parseMode: z.nativeEnum(ParseMode).default(ParseMode.HTML),
  buttons: z
    .array(
      z.object({
        text: z.string().min(1),
        url: z.string().url().optional(),
        callback_data: z.string().optional(),
      })
    )
    .optional()
    .nullable(),
  targetAudience: z.nativeEnum(TargetAudience).default(TargetAudience.ALL),
  scheduledAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export const getBroadcastsQuerySchema = z.object({
  status: z.nativeEnum(BroadcastStatus).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

export class BroadcastController {
  static async estimateAudience(req: Request, res: Response) {
    const audience = (req.query.targetAudience as TargetAudience) || TargetAudience.ALL;
    const count = await BroadcastService.estimateAudienceCount(audience);
    return sendSuccess(res, { targetAudience: audience, count }, 'Audience estimated');
  }

  static async createBroadcast(req: Request, res: Response) {
    const data = req.body;
    const adminId = req.admin?.id || null;

    const broadcast = await BroadcastService.createBroadcast({
      ...data,
      createdById: adminId,
    });

    await logAdminAction(req, 'CREATE_BROADCAST', 'Broadcast', broadcast.id, {
      title: broadcast.title,
      targetAudience: broadcast.targetAudience,
      totalRecipients: broadcast.totalRecipients,
    });

    return sendSuccess(res, broadcast, 'Broadcast scheduled/queued successfully', 201);
  }

  static async getBroadcasts(req: Request, res: Response) {
    const { status, page, limit } = req.query as any;
    const result = await BroadcastService.getBroadcasts({
      status,
      page: Number(page) || 1,
      limit: Number(limit) || 10,
    });

    return sendPaginated(
      res,
      result.broadcasts,
      result.total,
      result.page,
      result.limit,
      'Broadcasts retrieved successfully'
    );
  }

  static async getBroadcastById(req: Request, res: Response) {
    const { id } = req.params;
    const broadcast = await BroadcastService.getBroadcastById(id);

    if (!broadcast) {
      return sendError(res, 'Broadcast not found', 404);
    }

    return sendSuccess(res, broadcast, 'Broadcast details retrieved');
  }

  static async cancelBroadcast(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const broadcast = await BroadcastService.cancelBroadcast(id);
      await logAdminAction(req, 'CANCEL_BROADCAST', 'Broadcast', id);
      return sendSuccess(res, broadcast, 'Broadcast cancelled successfully');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }
}
