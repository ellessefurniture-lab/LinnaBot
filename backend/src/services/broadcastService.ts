import {
  BroadcastStatus,
  MediaType,
  ParseMode,
  Prisma,
  RecipientStatus,
  TargetAudience,
  UserStatus,
} from '@prisma/client';
import { prisma } from '../utils/prisma';
import { broadcastQueue } from '../workers/broadcastWorker';
import { logger } from '../utils/logger';

export interface CreateBroadcastInput {
  title: string;
  content: string;
  mediaType?: MediaType;
  mediaUrl?: string | null;
  parseMode?: ParseMode;
  buttons?: Array<{ text: string; url?: string; callback_data?: string }> | null;
  targetAudience?: TargetAudience;
  scheduledAt?: string | Date | null;
  createdById?: string | null;
}

export class BroadcastService {
  static getAudienceWhereClause(targetAudience: TargetAudience): Prisma.UserWhereInput {
    const now = new Date();
    const where: Prisma.UserWhereInput = {
      status: UserStatus.ACTIVE, // Never send to blocked or deleted users
    };

    if (targetAudience === TargetAudience.ACTIVE) {
      const activeCutoff = new Date(now);
      activeCutoff.setDate(now.getDate() - 7);
      where.lastActiveAt = { gte: activeCutoff };
    } else if (targetAudience === TargetAudience.INACTIVE) {
      const inactiveCutoff = new Date(now);
      inactiveCutoff.setDate(now.getDate() - 30);
      where.lastActiveAt = { lt: inactiveCutoff };
    } else if (targetAudience === TargetAudience.NEW_USERS) {
      const newCutoff = new Date(now);
      newCutoff.setDate(now.getDate() - 7);
      where.createdAt = { gte: newCutoff };
    }

    return where;
  }

  static async estimateAudienceCount(targetAudience: TargetAudience) {
    const where = this.getAudienceWhereClause(targetAudience);
    return prisma.user.count({ where });
  }

  static async createBroadcast(input: CreateBroadcastInput) {
    const audience = input.targetAudience || TargetAudience.ALL;
    const where = this.getAudienceWhereClause(audience);

    // Fetch target users
    const targetUsers = await prisma.user.findMany({
      where,
      select: { id: true },
    });

    const isScheduled = input.scheduledAt && new Date(input.scheduledAt) > new Date();
    const status = isScheduled ? BroadcastStatus.SCHEDULED : BroadcastStatus.PROCESSING;

    const broadcast = await prisma.broadcast.create({
      data: {
        title: input.title,
        content: input.content,
        mediaType: input.mediaType || MediaType.NONE,
        mediaUrl: input.mediaUrl || null,
        parseMode: input.parseMode || ParseMode.HTML,
        buttons: input.buttons ? JSON.stringify(input.buttons) : null,
        targetAudience: audience,
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        status,
        totalRecipients: targetUsers.length,
        createdById: input.createdById || null,
        recipients: {
          createMany: {
            data: targetUsers.map((u) => ({
              userId: u.id,
              status: RecipientStatus.PENDING,
            })),
          },
        },
      },
      include: {
        recipients: {
          take: 5,
        },
      },
    });

    // Enqueue the broadcast job
    try {
      const delay = isScheduled ? Math.max(0, new Date(input.scheduledAt!).getTime() - Date.now()) : 0;
      await broadcastQueue.add(
        'send-broadcast',
        { broadcastId: broadcast.id },
        { delay }
      );
      logger.info(`Broadcast ${broadcast.id} queued (delay: ${delay}ms)`);
    } catch (err) {
      logger.error(`Failed to queue broadcast ${broadcast.id}:`, err);
    }

    return broadcast;
  }

  static async getBroadcasts({
    status,
    page = 1,
    limit = 10,
  }: {
    status?: BroadcastStatus;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const where: Prisma.BroadcastWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [broadcasts, total] = await Promise.all([
      prisma.broadcast.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
      prisma.broadcast.count({ where }),
    ]);

    return { broadcasts, total, page, limit };
  }

  static async getBroadcastById(id: string) {
    return prisma.broadcast.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        recipients: {
          take: 50,
          include: {
            user: {
              select: {
                id: true,
                telegramId: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
  }

  static async cancelBroadcast(id: string) {
    const broadcast = await prisma.broadcast.findUnique({ where: { id } });
    if (!broadcast) {
      throw new Error('Broadcast not found');
    }

    if (broadcast.status !== BroadcastStatus.SCHEDULED && broadcast.status !== BroadcastStatus.DRAFT) {
      throw new Error('Only scheduled or draft broadcasts can be cancelled');
    }

    return prisma.broadcast.update({
      where: { id },
      data: { status: BroadcastStatus.CANCELLED },
    });
  }
}
