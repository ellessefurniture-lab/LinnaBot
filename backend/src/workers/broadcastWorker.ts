import { Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';
import { BroadcastStatus, RecipientStatus, UserStatus } from '../types/enums';
import { config } from '../config';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { botInstance } from '../telegram/bot';

const QUEUE_NAME = 'broadcast-queue';

let redisClient: IORedis | null = null;
let isRedisAvailable = false;

// Attempt to connect to Redis
try {
  redisClient = new IORedis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => {
      if (times > 3) {
        logger.warn('Redis connection failed. Switching to in-memory broadcast processor.');
        return null; // Stop retrying
      }
      return Math.min(times * 1000, 3000);
    },
  });

  redisClient.on('connect', () => {
    isRedisAvailable = true;
    logger.info('Connected to Redis for BullMQ queues');
  });

  redisClient.on('error', (err) => {
    if (isRedisAvailable) {
      logger.warn(`Redis connection error: ${err.message}`);
    }
    isRedisAvailable = false;
  });
} catch (e) {
  isRedisAvailable = false;
}

// In-Memory Fallback Queue for environments without Redis
class InMemoryQueue {
  private queue: Array<{ name: string; data: any; delay?: number; executeAt: number }> = [];
  private isProcessing = false;

  constructor() {
    setInterval(() => this.processNext(), 1000);
  }

  async add(name: string, data: any, opts?: { delay?: number }) {
    const delay = opts?.delay || 0;
    this.queue.push({
      name,
      data,
      delay,
      executeAt: Date.now() + delay,
    });
    return { id: `mem-${Date.now()}` };
  }

  private async processNext() {
    if (this.isProcessing) return;
    const now = Date.now();
    const readyIndex = this.queue.findIndex((job) => job.executeAt <= now);
    if (readyIndex === -1) return;

    this.isProcessing = true;
    const [job] = this.queue.splice(readyIndex, 1);
    try {
      await processBroadcastJob(job.data);
    } catch (err) {
      logger.error('In-memory queue job processing error:', err);
    } finally {
      this.isProcessing = false;
    }
  }
}

// Initialize Queue
let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;

if (redisClient) {
  try {
    bullQueue = new Queue(QUEUE_NAME, {
      connection: redisClient,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });

    bullWorker = new Worker(
      QUEUE_NAME,
      async (job) => {
        logger.info(`Processing BullMQ broadcast job: ${job.id}`);
        await processBroadcastJob(job.data);
      },
      {
        connection: redisClient,
        concurrency: 1, // Controlled concurrency for rate limiting
      }
    );

    bullWorker.on('completed', (job) => {
      logger.info(`Broadcast job ${job.id} completed successfully`);
    });

    bullWorker.on('failed', (job, err) => {
      logger.error(`Broadcast job ${job?.id} failed:`, err);
    });
  } catch (err) {
    logger.warn('Failed to initialize BullMQ worker, using fallback.');
  }
}

const memoryQueue = new InMemoryQueue();

export const broadcastQueue = {
  add: async (name: string, data: any, opts?: { delay?: number }) => {
    if (isRedisAvailable && bullQueue) {
      try {
        return await bullQueue.add(name, data, opts);
      } catch (err) {
        logger.warn('BullMQ add failed, falling back to in-memory queue:', err);
      }
    }
    return memoryQueue.add(name, data, opts);
  },
};

// Core Broadcast Processor Logic
export async function processBroadcastJob(data: { broadcastId: string }) {
  const { broadcastId } = data;
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    include: {
      recipients: {
        where: { status: RecipientStatus.PENDING },
        include: { user: true },
      },
    },
  });

  if (!broadcast) {
    logger.warn(`Broadcast ${broadcastId} not found`);
    return;
  }

  if (broadcast.status === BroadcastStatus.CANCELLED) {
    logger.info(`Broadcast ${broadcastId} was cancelled, skipping`);
    return;
  }

  // Mark status as PROCESSING
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: BroadcastStatus.PROCESSING,
      startedAt: broadcast.startedAt || new Date(),
    },
  });

  let buttonsMarkup: any = undefined;
  if (broadcast.buttons) {
    try {
      const parsedButtons = JSON.parse(broadcast.buttons);
      if (Array.isArray(parsedButtons) && parsedButtons.length > 0) {
        buttonsMarkup = {
          inline_keyboard: parsedButtons.map((btn: any) => [
            btn.url
              ? { text: btn.text, url: btn.url }
              : { text: btn.text, callback_data: btn.callback_data || 'btn_click' },
          ]),
        };
      }
    } catch (e) {
      logger.error('Failed to parse broadcast buttons:', e);
    }
  }

  let successCount = broadcast.successfulCount;
  let failCount = broadcast.failedCount;

  logger.info(`Starting broadcast ${broadcastId} to ${broadcast.recipients.length} pending recipients`);

  // Rate Limiter: 25 messages/sec max (Telegram threshold is ~30/sec)
  const delayMs = 40;

  for (const recipient of broadcast.recipients) {
    const user = recipient.user;
    if (user.status === UserStatus.BLOCKED) {
      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: RecipientStatus.FAILED,
          errorMessage: 'User is blocked',
        },
      });
      failCount++;
      continue;
    }

    try {
      if (botInstance && botInstance.telegram) {
        const extra: any = {
          parse_mode: broadcast.parseMode === 'PLAIN' ? undefined : broadcast.parseMode,
          reply_markup: buttonsMarkup,
        };

        if (broadcast.mediaType === 'PHOTO' && broadcast.mediaUrl) {
          await botInstance.telegram.sendPhoto(user.telegramId, broadcast.mediaUrl, {
            caption: broadcast.content,
            ...extra,
          });
        } else if (broadcast.mediaType === 'VIDEO' && broadcast.mediaUrl) {
          await botInstance.telegram.sendVideo(user.telegramId, broadcast.mediaUrl, {
            caption: broadcast.content,
            ...extra,
          });
        } else if (broadcast.mediaType === 'DOCUMENT' && broadcast.mediaUrl) {
          await botInstance.telegram.sendDocument(user.telegramId, broadcast.mediaUrl, {
            caption: broadcast.content,
            ...extra,
          });
        } else {
          // Text message
          await botInstance.telegram.sendMessage(user.telegramId, broadcast.content, extra);
        }
      }

      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: RecipientStatus.SENT,
          sentAt: new Date(),
        },
      });
      successCount++;
    } catch (error: any) {
      const errorMsg = error?.message || 'Telegram send failure';
      logger.warn(`Failed to send broadcast ${broadcastId} to user ${user.telegramId}: ${errorMsg}`);

      // If user blocked bot, mark in database
      if (error?.response?.error_code === 403 || errorMsg.includes('bot was blocked')) {
        await prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.BLOCKED },
        });
      }

      await prisma.broadcastRecipient.update({
        where: { id: recipient.id },
        data: {
          status: RecipientStatus.FAILED,
          errorMessage: errorMsg,
        },
      });
      failCount++;
    }

    // Rate-limiting delay
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  // Mark COMPLETED
  await prisma.broadcast.update({
    where: { id: broadcastId },
    data: {
      status: BroadcastStatus.COMPLETED,
      successfulCount: successCount,
      failedCount: failCount,
      completedAt: new Date(),
    },
  });

  logger.info(`Broadcast ${broadcastId} completed. Success: ${successCount}, Failed: ${failCount}`);
}
