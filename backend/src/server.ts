import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './utils/prisma';
import { initTelegramBot, startBotLifecycle, botInstance } from './telegram/bot';

async function bootstrap() {
  const app = createApp();

  // Test Prisma Connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully via Prisma');
  } catch (err: any) {
    logger.error('Database connection failed:', err);
    // Continue running so API / health check still boots
  }

  // Initialize Telegram Bot
  try {
    initTelegramBot();
    await startBotLifecycle();
  } catch (err: any) {
    logger.error('Failed to start Telegram Bot lifecycle:', err);
  }

  const server = app.listen(config.PORT, () => {
    logger.info(`🚀 Server running on port ${config.PORT} in [${config.NODE_ENV}] mode`);
    logger.info(`📡 API endpoint: http://localhost:${config.PORT}/api`);
    logger.info(`🤖 Telegram Bot Mode: ${config.BOT_MODE}`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Initiating graceful shutdown...`);
    if (botInstance) {
      try {
        botInstance.stop(signal);
      } catch (e) {}
    }
    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Database disconnected.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  logger.error('Server failed to start:', error);
  process.exit(1);
});
