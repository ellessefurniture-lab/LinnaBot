import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { MessageService } from '../services/messageService';
import { config } from '../config';
import { botInstance } from '../telegram/bot';
import { prisma } from '../utils/prisma';
import { sendSuccess } from '../utils/apiResponse';

export class DashboardController {
  static async getStats(req: Request, res: Response) {
    const [userStats, messageStats] = await Promise.all([
      UserService.getUserStats(),
      MessageService.getMessageStats(),
    ]);

    // Bot status
    const botStatus = {
      isConfigured: !!config.TELEGRAM_BOT_TOKEN,
      mode: config.BOT_MODE,
      isRunning: !!botInstance,
      webhookUrl: config.TELEGRAM_WEBHOOK_URL || null,
    };

    // Calculate daily new user activity for past 7 days
    const days: Array<{ date: string; users: number; messages: number }> = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

      const [usersCount, messagesCount] = await Promise.all([
        prisma.user.count({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
        prisma.message.count({
          where: {
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        }),
      ]);

      days.push({
        date: startOfDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        users: usersCount,
        messages: messagesCount,
      });
    }

    // Recent 5 broadcasts
    const recentBroadcasts = await prisma.broadcast.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        totalRecipients: true,
        successfulCount: true,
        failedCount: true,
        createdAt: true,
      },
    });

    // Recent 5 audit logs
    const recentActivity = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: { username: true },
        },
      },
    });

    return sendSuccess(
      res,
      {
        users: userStats,
        messages: messageStats,
        bot: botStatus,
        chartData: days,
        recentBroadcasts,
        recentActivity,
      },
      'Dashboard stats retrieved'
    );
  }
}
