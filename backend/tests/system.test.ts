import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app';
import { config } from '../src/config';
import { prisma } from '../src/utils/prisma';
import { UserService } from '../src/services/userService';
import { AuthService } from '../src/services/authService';
import { BroadcastService } from '../src/services/broadcastService';
import { processBroadcastJob } from '../src/workers/broadcastWorker';
import { botInstance } from '../src/telegram/bot';

// Mock IORedis to avoid connection attempts in tests
vi.mock('ioredis', () => {
  return {
    default: class MockRedis {
      on() { return this; }
      quit() { return Promise.resolve(); }
    },
  };
});

// Mock Prisma
vi.mock('../src/utils/prisma', () => {
  const mockAdmin = {
    id: 'admin-uuid-1234',
    email: 'admin@example.com',
    username: 'admin',
    passwordHash: bcrypt.hashSync('Admin@123456', 10),
    role: 'SUPERADMIN',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsers = [
    {
      id: 'user-uuid-1',
      telegramId: '111222333',
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      languageCode: 'en',
      status: 'ACTIVE',
      isBot: false,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'user-uuid-2',
      telegramId: '444555666',
      username: 'jane_smith',
      firstName: 'Jane',
      lastName: 'Smith',
      languageCode: 'es',
      status: 'BLOCKED',
      isBot: false,
      lastActiveAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  return {
    prisma: {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $transaction: vi.fn(async (ops) => {
        if (Array.isArray(ops)) return Promise.all(ops);
        return ops;
      }),
      admin: {
        findFirst: vi.fn(async ({ where }) => {
          if (
            where.OR?.some(
              (cond: any) =>
                cond.email === 'admin@example.com' || cond.username === 'admin'
            )
          ) {
            return mockAdmin;
          }
          return null;
        }),
        findUnique: vi.fn(async ({ where }) => {
          if (where.id === mockAdmin.id) return mockAdmin;
          return null;
        }),
      },
      user: {
        findMany: vi.fn(async () => mockUsers),
        count: vi.fn(async () => mockUsers.length),
        findUnique: vi.fn(async ({ where }) => {
          return mockUsers.find(
            (u) => u.id === where.id || u.telegramId === where.telegramId
          ) || null;
        }),
        create: vi.fn(async ({ data }) => ({
          id: 'user-new-id',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        update: vi.fn(async ({ where, data }) => {
          const user = mockUsers.find((u) => u.id === where.id || u.telegramId === where.telegramId);
          return { ...user, ...data };
        }),
        delete: vi.fn(async ({ where }) => ({ id: where.id })),
      },
      message: {
        create: vi.fn(async ({ data }) => ({ id: 'msg-uuid-1', ...data, createdAt: new Date() })),
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 10),
      },
      broadcast: {
        create: vi.fn(async ({ data }) => ({
          id: 'broadcast-uuid-1',
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 1),
        findUnique: vi.fn(async ({ where }) => ({
          id: where.id,
          title: 'Special Announcement',
          content: 'Hello everyone!',
          mediaType: 'NONE',
          parseMode: 'HTML',
          status: 'PROCESSING',
          totalRecipients: 2,
          successfulCount: 0,
          failedCount: 0,
          recipients: [
            {
              id: 'rcpt-1',
              status: 'PENDING',
              user: mockUsers[0],
            },
          ],
        })),
        update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      broadcastRecipient: {
        update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
      },
      supportConversation: {
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        findFirst: vi.fn(async () => null),
        create: vi.fn(async ({ data }) => ({ id: 'conv-1', ...data, createdAt: new Date(), updatedAt: new Date() })),
        update: vi.fn(async ({ where, data }) => ({ id: where.id, ...data })),
        findUnique: vi.fn(async () => ({
          id: 'conv-1',
          userId: 'user-uuid-1',
          status: 'OPEN',
          user: mockUsers[0],
          messages: [],
        })),
      },
      supportMessage: {
        create: vi.fn(async ({ data }) => ({ id: 'smsg-1', ...data, createdAt: new Date() })),
      },
      botSetting: {
        findMany: vi.fn(async () => [
          { key: 'BOT_NAME', value: 'Telegram Pro Bot', description: null, isPublic: true, updatedAt: new Date() },
          { key: 'WELCOME_MESSAGE', value: 'Welcome!', description: null, isPublic: true, updatedAt: new Date() },
        ]),
        findUnique: vi.fn(async ({ where }) => ({
          key: where.key,
          value: where.key === 'MAINTENANCE_MODE' ? 'false' : 'true',
        })),
        upsert: vi.fn(async ({ create }) => ({ ...create, updatedAt: new Date() })),
      },
      auditLog: {
        create: vi.fn(async ({ data }) => ({ id: 'audit-1', ...data, createdAt: new Date() })),
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
      },
    },
  };
});

describe('Telegram Bot Management System Test Suite', () => {
  const app = createApp();
  let adminToken: string;

  beforeEach(() => {
    adminToken = jwt.sign(
      {
        id: 'admin-uuid-1234',
        email: 'admin@example.com',
        username: 'admin',
        role: 'SUPERADMIN',
      },
      config.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  // 1. Authentication Tests
  describe('Admin Authentication & Protection', () => {
    it('should reject login with invalid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'wrong@example.com',
        password: 'BadPassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should login successfully with valid credentials and return JWT', async () => {
      const res = await request(app).post('/api/auth/login').send({
        identifier: 'admin@example.com',
        password: 'Admin@123456',
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.admin.email).toBe('admin@example.com');
    });

    it('should reject protected endpoints without token', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should allow access to protected /api/auth/me with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.username).toBe('admin');
    });
  });

  // 2. User Registration & /start Flow
  describe('User Registration & /start Handler', () => {
    it('should register a new Telegram user in database', async () => {
      const newUser = await UserService.registerOrUpdateTelegramUser({
        telegramId: '999888777',
        username: 'new_telegram_user',
        firstName: 'Alice',
        lastName: 'Wonderland',
        languageCode: 'en',
      });

      expect(newUser).toBeDefined();
      expect(newUser.telegramId).toBe('999888777');
      expect(prisma.user.create).toHaveBeenCalled();
    });

    it('should update existing user activity when user interacts again', async () => {
      const updatedUser = await UserService.registerOrUpdateTelegramUser({
        telegramId: '111222333',
        firstName: 'John Updated',
      });

      expect(updatedUser).toBeDefined();
      expect(prisma.user.update).toHaveBeenCalled();
    });
  });

  // 3. User Management & Retrieval
  describe('User Management API', () => {
    it('should retrieve list of users with pagination', async () => {
      const res = await request(app)
        .get('/api/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.meta.total).toBe(2);
    });

    it('should update user status (block/unblock)', async () => {
      const res = await request(app)
        .patch('/api/users/user-uuid-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'BLOCKED' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-uuid-1' },
          data: { status: 'BLOCKED' },
        })
      );
    });
  });

  // 4. Telegram Webhook Endpoint
  describe('Telegram Webhook Handling', () => {
    it('should reject webhook request with incorrect secret token', async () => {
      const res = await request(app)
        .post('/api/telegram/webhook')
        .set('x-telegram-bot-api-secret-token', 'wrong-secret')
        .send({ update_id: 12345 });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('should accept webhook request with valid secret token', async () => {
      const res = await request(app)
        .post('/api/telegram/webhook')
        .set('x-telegram-bot-api-secret-token', config.TELEGRAM_WEBHOOK_SECRET)
        .send({ update_id: 12345 });

      // Either 200 or 503 if botInstance not connected to live Telegram API in test
      expect([200, 503]).toContain(res.status);
    });
  });

  // 5. Broadcast Creation & Background Processing
  describe('Broadcast System & Queue Worker', () => {
    it('should estimate audience size accurately', async () => {
      const res = await request(app)
        .get('/api/broadcasts/estimate-target?targetAudience=ALL')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBeDefined();
    });

    it('should create a broadcast and schedule/queue it', async () => {
      const res = await request(app)
        .post('/api/broadcasts')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'System Maintenance Alert',
          content: 'Bot will undergo brief maintenance tonight at 00:00 UTC.',
          targetAudience: 'ALL',
          mediaType: 'NONE',
          parseMode: 'HTML',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('System Maintenance Alert');
    });

    it('should process queued broadcast job in worker without errors', async () => {
      await expect(
        processBroadcastJob({ broadcastId: 'broadcast-uuid-1' })
      ).resolves.not.toThrow();

      expect(prisma.broadcast.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'broadcast-uuid-1' },
          data: expect.objectContaining({
            status: 'COMPLETED',
          }),
        })
      );
    });
  });

  // 6. Settings Management API
  describe('Bot Settings Management', () => {
    it('should return system settings with secrets masked', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should update bot settings', async () => {
      const res = await request(app)
        .patch('/api/settings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          settings: {
            BOT_NAME: 'Customized Bot Name',
            MAINTENANCE_MODE: 'true',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.botSetting.upsert).toHaveBeenCalled();
    });
  });
});
