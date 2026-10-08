import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters').default('super-secret-jwt-key-min-32-chars-long!'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  ADMIN_EMAIL: z.string().email().default('admin@example.com'),
  ADMIN_USERNAME: z.string().default('admin'),
  ADMIN_PASSWORD: z.string().default('Admin@123456'),
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default('webhook-secret-token-12345'),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),
  BOT_MODE: z.enum(['polling', 'webhook', 'disabled']).default('polling'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ENABLE_RATE_LIMITING: z.coerce.boolean().default(true),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  // In development/test, we fallback to defaults where possible to avoid abrupt crash
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const config = parsed.success
  ? parsed.data
  : {
      PORT: Number(process.env.PORT) || 5000,
      NODE_ENV: (process.env.NODE_ENV as any) || 'development',
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/telegram_bot_db?schema=public',
      JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-key-min-32-chars-long!',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
      ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@example.com',
      ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
      ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'Admin@123456',
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
      TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || 'webhook-secret-token-12345',
      TELEGRAM_WEBHOOK_URL: process.env.TELEGRAM_WEBHOOK_URL,
      BOT_MODE: (process.env.BOT_MODE as any) || 'polling',
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
      ENABLE_RATE_LIMITING: true,
    };
