import { Prisma } from '@prisma/client';
import { MessageDirection, MessageStatus, MessageType } from '../types/enums';
import { prisma } from '../utils/prisma';

export interface LogMessageInput {
  telegramMessageId?: string | null;
  userId: string;
  direction: MessageDirection;
  messageType?: MessageType;
  content?: string | null;
  mediaUrl?: string | null;
  fileId?: string | null;
  metadata?: Record<string, any> | null;
  status?: MessageStatus;
}

export class MessageService {
  static async logMessage(input: LogMessageInput) {
    return prisma.message.create({
      data: {
        telegramMessageId: input.telegramMessageId ? String(input.telegramMessageId) : null,
        userId: input.userId,
        direction: input.direction,
        messageType: input.messageType || MessageType.TEXT,
        content: input.content || null,
        mediaUrl: input.mediaUrl || null,
        fileId: input.fileId || null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        status: input.status || MessageStatus.SENT,
      },
    });
  }

  static async getMessages({
    search,
    direction,
    messageType,
    userId,
    page = 1,
    limit = 20,
  }: {
    search?: string;
    direction?: MessageDirection;
    messageType?: MessageType;
    userId?: string;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const where: Prisma.MessageWhereInput = {};

    if (direction) {
      where.direction = direction;
    }

    if (messageType) {
      where.messageType = messageType;
    }

    if (userId) {
      where.userId = userId;
    }

    if (search && search.trim()) {
      where.content = { contains: search.trim() };
    }

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      }),
      prisma.message.count({ where }),
    ]);

    return { messages, total, page, limit };
  }

  static async getMessageStats() {
    const [incomingCount, outgoingCount, totalCount] = await Promise.all([
      prisma.message.count({ where: { direction: MessageDirection.INCOMING } }),
      prisma.message.count({ where: { direction: MessageDirection.OUTGOING } }),
      prisma.message.count(),
    ]);

    return {
      incomingCount,
      outgoingCount,
      totalCount,
    };
  }
}
