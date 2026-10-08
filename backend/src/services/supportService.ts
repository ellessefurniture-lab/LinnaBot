import { Prisma, SenderType, SupportStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { botInstance } from '../telegram/bot';
import { MessageService } from './messageService';
import { logger } from '../utils/logger';

export class SupportService {
  static async getConversations({
    status,
    search,
    page = 1,
    limit = 15,
  }: {
    status?: SupportStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const skip = (page - 1) * limit;
    const where: Prisma.SupportConversationWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.user = {
        OR: [
          { username: { contains: term, mode: 'insensitive' } },
          { firstName: { contains: term, mode: 'insensitive' } },
          { telegramId: { contains: term } },
        ],
      };
    }

    const [conversations, total] = await Promise.all([
      prisma.supportConversation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastMessageAt: 'desc' },
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
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
      }),
      prisma.supportConversation.count({ where }),
    ]);

    return { conversations, total, page, limit };
  }

  static async getConversationById(id: string) {
    return prisma.supportConversation.findUnique({
      where: { id },
      include: {
        user: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  static async createOrUpdateUserSupportMessage(
    userId: string,
    content: string,
    mediaUrl?: string
  ) {
    // Find open conversation or create a new one
    let conversation = await prisma.supportConversation.findFirst({
      where: {
        userId,
        status: SupportStatus.OPEN,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!conversation) {
      conversation = await prisma.supportConversation.create({
        data: {
          userId,
          status: SupportStatus.OPEN,
          subject: content.length > 50 ? `${content.substring(0, 47)}...` : content,
          lastMessageAt: new Date(),
        },
      });
    } else {
      await prisma.supportConversation.update({
        where: { id: conversation.id },
        data: { lastMessageAt: new Date() },
      });
    }

    const message = await prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderType: SenderType.USER,
        senderId: userId,
        content,
        mediaUrl: mediaUrl || null,
        isRead: false,
      },
    });

    return { conversation, message };
  }

  static async replyToConversation(
    conversationId: string,
    adminId: string,
    content: string
  ) {
    const conversation = await prisma.supportConversation.findUnique({
      where: { id: conversationId },
      include: { user: true },
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 1. Send Telegram message to user if bot is active
    let telegramMessageId: string | null = null;
    try {
      if (botInstance && botInstance.telegram) {
        const sent = await botInstance.telegram.sendMessage(
          conversation.user.telegramId,
          `💬 <b>Support Response:</b>\n\n${content}`,
          { parse_mode: 'HTML' }
        );
        telegramMessageId = String(sent.message_id);

        // Also log to Message history
        await MessageService.logMessage({
          telegramMessageId,
          userId: conversation.userId,
          direction: 'OUTGOING',
          content,
          metadata: { supportConversationId: conversationId },
        });
      }
    } catch (err: any) {
      logger.error(`Failed to send Telegram reply to user ${conversation.user.telegramId}:`, err);
      // Continue so message is recorded in conversation
    }

    // 2. Record support message
    const supportMessage = await prisma.supportMessage.create({
      data: {
        conversationId,
        senderType: SenderType.ADMIN,
        senderId: adminId,
        content,
        isRead: true,
      },
    });

    // 3. Update conversation lastMessageAt
    await prisma.supportConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    });

    return supportMessage;
  }

  static async updateConversationStatus(id: string, status: SupportStatus) {
    return prisma.supportConversation.update({
      where: { id },
      data: { status },
    });
  }
}
