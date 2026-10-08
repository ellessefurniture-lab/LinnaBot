import { Prisma, UserStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';

export interface GetUsersQuery {
  search?: string;
  status?: UserStatus;
  page?: number;
  limit?: number;
}

export class UserService {
  static async getUsers({ search, status, page = 1, limit = 10 }: GetUsersQuery) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { username: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { telegramId: { contains: term } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastActiveAt: 'desc' },
        include: {
          _count: {
            select: {
              messages: true,
              supportConversations: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  static async getUserById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        messages: {
          take: 20,
          orderBy: { createdAt: 'desc' },
        },
        supportConversations: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            messages: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
          },
        },
        broadcastRecipients: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            broadcast: {
              select: {
                id: true,
                title: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });
  }

  static async getUserByTelegramId(telegramId: string) {
    return prisma.user.findUnique({
      where: { telegramId },
    });
  }

  static async registerOrUpdateTelegramUser(data: {
    telegramId: string;
    username?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    languageCode?: string | null;
    isBot?: boolean;
  }) {
    const existing = await prisma.user.findUnique({
      where: { telegramId: data.telegramId },
    });

    if (existing) {
      return prisma.user.update({
        where: { telegramId: data.telegramId },
        data: {
          username: data.username ?? existing.username,
          firstName: data.firstName ?? existing.firstName,
          lastName: data.lastName ?? existing.lastName,
          languageCode: data.languageCode ?? existing.languageCode,
          lastActiveAt: new Date(),
        },
      });
    }

    return prisma.user.create({
      data: {
        telegramId: data.telegramId,
        username: data.username || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        languageCode: data.languageCode || null,
        isBot: data.isBot || false,
        status: UserStatus.ACTIVE,
        lastActiveAt: new Date(),
      },
    });
  }

  static async updateUserStatus(id: string, status: UserStatus) {
    return prisma.user.update({
      where: { id },
      data: { status },
    });
  }

  static async deleteUser(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  static async getUserStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - 7);

    // Active in last 7 days
    const activeThreshold = new Date(now);
    activeThreshold.setDate(now.getDate() - 7);

    const [totalUsers, activeUsers, newToday, newThisWeek, blockedUsers] = await Promise.all([
      prisma.user.count({ where: { status: { not: UserStatus.DELETED } } }),
      prisma.user.count({
        where: {
          status: UserStatus.ACTIVE,
          lastActiveAt: { gte: activeThreshold },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfToday },
        },
      }),
      prisma.user.count({
        where: {
          createdAt: { gte: startOfWeek },
        },
      }),
      prisma.user.count({
        where: {
          status: UserStatus.BLOCKED,
        },
      }),
    ]);

    return {
      totalUsers,
      activeUsers,
      newToday,
      newThisWeek,
      blockedUsers,
    };
  }
}
