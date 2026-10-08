import { Telegraf, Markup } from 'telegraf';
import { MessageDirection, MessageType, UserStatus } from '../types/enums';
import { config } from '../config';
import { logger } from '../utils/logger';
import { UserService } from '../services/userService';
import { MessageService } from '../services/messageService';
import { SettingsService } from '../services/settingsService';
import { SupportService } from '../services/supportService';
import { prisma } from '../utils/prisma';

export let botInstance: Telegraf | null = null;

// Track user state in-memory (e.g. waiting for support message)
const userStates = new Map<string, { state: string; timestamp: number }>();

export function getBotKeyboard() {
  return Markup.inlineKeyboard([
    [Markup.button.callback('📋 Menu', 'action_menu'), Markup.button.callback('👤 My Account', 'action_account')],
    [Markup.button.callback('ℹ️ Help', 'action_help'), Markup.button.callback('📞 Contact Support', 'action_support')],
    [Markup.button.callback('📢 Announcements', 'action_announcements')],
  ]);
}

export function initTelegramBot(): Telegraf | null {
  if (!config.TELEGRAM_BOT_TOKEN) {
    logger.warn('TELEGRAM_BOT_TOKEN is not configured. Telegram bot service disabled.');
    return null;
  }

  try {
    const bot = new Telegraf(config.TELEGRAM_BOT_TOKEN);
    botInstance = bot;

    // 1. Error Handler
    bot.catch((err: any, ctx) => {
      logger.error(`Telegraf error encountered for update ${ctx?.update?.update_id}:`, err);
    });

    // 2. Global Middleware: Maintenance Check & User Registration Tracking
    bot.use(async (ctx, next) => {
      const from = ctx.from;
      if (!from) return next();

      const telegramId = String(from.id);

      // Check maintenance mode
      const maintenance = await SettingsService.getSetting('MAINTENANCE_MODE', 'false');
      if (maintenance === 'true') {
        const text = (ctx.message as any)?.text;
        // Allow /start to explain maintenance
        if (text !== '/start') {
          await ctx.reply('⚠️ <b>System Notice:</b>\nThe bot is currently undergoing maintenance. Please try again later.', {
            parse_mode: 'HTML',
          });
          return;
        }
      }

      // Check Registration Enabled
      const registrationEnabled = await SettingsService.getSetting('REGISTRATION_ENABLED', 'true');
      const existingUser = await UserService.getUserByTelegramId(telegramId);

      if (!existingUser && registrationEnabled === 'false') {
        await ctx.reply('⛔ New user registrations are currently disabled. Please contact an administrator.');
        return;
      }

      // Register or update user
      try {
        const dbUser = await UserService.registerOrUpdateTelegramUser({
          telegramId,
          username: from.username || null,
          firstName: from.first_name || null,
          lastName: from.last_name || null,
          languageCode: from.language_code || null,
          isBot: from.is_bot || false,
        });

        // If user is BLOCKED, reject interaction
        if (dbUser.status === UserStatus.BLOCKED) {
          await ctx.reply('🚫 Your account has been suspended by the administrator.');
          return;
        }

        // Attach DB user to state
        (ctx.state as any).user = dbUser;
      } catch (err) {
        logger.error('Failed to register/update user in middleware:', err);
      }

      return next();
    });

    // 3. /start Command Handler
    bot.start(async (ctx) => {
      const user = (ctx.state as any).user;
      const welcomeMsg = await SettingsService.getSetting(
        'WELCOME_MESSAGE',
        '👋 Welcome to our bot!\n\nPlease choose an option from the menu below:'
      );

      // Log incoming /start command
      if (user) {
        await MessageService.logMessage({
          telegramMessageId: String(ctx.message?.message_id),
          userId: user.id,
          direction: MessageDirection.INCOMING,
          messageType: MessageType.TEXT,
          content: '/start',
        });
      }

      await ctx.reply(welcomeMsg, {
        parse_mode: 'HTML',
        ...getBotKeyboard(),
      });

      // Log outgoing response
      if (user) {
        await MessageService.logMessage({
          userId: user.id,
          direction: MessageDirection.OUTGOING,
          messageType: MessageType.TEXT,
          content: welcomeMsg,
        });
      }
    });

    // 4. Action: Main Menu
    bot.action('action_menu', async (ctx) => {
      await ctx.answerCbQuery();
      const user = (ctx.state as any).user;
      const menuText =
        '📋 <b>Main Menu:</b>\n\n' +
        '• <b>My Account:</b> Check your user profile and status\n' +
        '• <b>Announcements:</b> View recent updates and broadcasts\n' +
        '• <b>Help:</b> Learn how to navigate the system\n' +
        '• <b>Support:</b> Connect directly with our helpdesk team\n\n' +
        'Select an option below:';

      await ctx.reply(menuText, {
        parse_mode: 'HTML',
        ...getBotKeyboard(),
      });

      if (user) {
        await MessageService.logMessage({
          userId: user.id,
          direction: MessageDirection.INCOMING,
          messageType: MessageType.CALLBACK_QUERY,
          content: 'action_menu',
        });
      }
    });

    // 5. Action: My Account
    bot.action('action_account', async (ctx) => {
      await ctx.answerCbQuery();
      const user = (ctx.state as any).user;
      if (!user) return;

      const profileText =
        `👤 <b>Your Account Details:</b>\n\n` +
        `🆔 <b>Telegram ID:</b> <code>${user.telegramId}</code>\n` +
        `👤 <b>Username:</b> ${user.username ? `@${user.username}` : '<i>Not set</i>'}\n` +
        `📛 <b>Name:</b> ${user.firstName || ''} ${user.lastName || ''}\n` +
        `🌐 <b>Language:</b> ${user.languageCode || 'en'}\n` +
        `📅 <b>Member Since:</b> ${new Date(user.createdAt).toLocaleDateString()}\n` +
        `⚡ <b>Status:</b> ${user.status}\n`;

      await ctx.reply(profileText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back to Menu', 'action_menu')],
        ]),
      });

      await MessageService.logMessage({
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.CALLBACK_QUERY,
        content: 'action_account',
      });
    });

    // 6. Action: Help
    bot.action('action_help', async (ctx) => {
      await ctx.answerCbQuery();
      const user = (ctx.state as any).user;
      const helpText =
        `ℹ️ <b>Help & FAQ:</b>\n\n` +
        `• <b>How do I send a message to support?</b>\n` +
        `Click "Contact Support", then simply type and send your inquiry.\n\n` +
        `• <b>How do I restart the bot?</b>\n` +
        `Send the <code>/start</code> command anytime.\n\n` +
        `• <b>Need urgent help?</b>\n` +
        `Reach out directly to our admin team.`;

      await ctx.reply(helpText, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📞 Contact Support Now', 'action_support')],
          [Markup.button.callback('⬅️ Back to Menu', 'action_menu')],
        ]),
      });

      if (user) {
        await MessageService.logMessage({
          userId: user.id,
          direction: MessageDirection.INCOMING,
          messageType: MessageType.CALLBACK_QUERY,
          content: 'action_help',
        });
      }
    });

    // 7. Action: Announcements
    bot.action('action_announcements', async (ctx) => {
      await ctx.answerCbQuery();
      const user = (ctx.state as any).user;

      // Fetch the latest 3 broadcasts
      const recentBroadcasts = await prisma.broadcast.findMany({
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      let text = '📢 <b>Recent Announcements:</b>\n\n';
      if (recentBroadcasts.length === 0) {
        text += '<i>No announcements published yet. Check back soon!</i>';
      } else {
        recentBroadcasts.forEach((b, idx) => {
          text += `<b>${idx + 1}. ${b.title}</b>\n${b.content.substring(0, 150)}${b.content.length > 150 ? '...' : ''}\n📅 ${new Date(b.createdAt).toLocaleDateString()}\n\n`;
        });
      }

      await ctx.reply(text, {
        parse_mode: 'HTML',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('⬅️ Back to Menu', 'action_menu')],
        ]),
      });

      if (user) {
        await MessageService.logMessage({
          userId: user.id,
          direction: MessageDirection.INCOMING,
          messageType: MessageType.CALLBACK_QUERY,
          content: 'action_announcements',
        });
      }
    });

    // 8. Action: Contact Support
    bot.action('action_support', async (ctx) => {
      await ctx.answerCbQuery();
      const from = ctx.from;
      if (!from) return;

      userStates.set(String(from.id), { state: 'WAITING_SUPPORT_MESSAGE', timestamp: Date.now() });

      const promptText = '📞 Please send your message and our support team will respond.';
      await ctx.reply(promptText, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('❌ Cancel', 'action_menu')],
        ]),
      });
    });

    // 9. Generic Text Messages & Support Handler
    bot.on('text', async (ctx) => {
      const user = (ctx.state as any).user;
      if (!user) return;

      const text = ctx.message.text;
      const stateObj = userStates.get(user.telegramId);

      // Check if user was in support mode
      if (stateObj && stateObj.state === 'WAITING_SUPPORT_MESSAGE') {
        userStates.delete(user.telegramId);

        // Store into Support Conversation
        await SupportService.createOrUpdateUserSupportMessage(user.id, text);

        // Also log to Message table
        await MessageService.logMessage({
          telegramMessageId: String(ctx.message.message_id),
          userId: user.id,
          direction: MessageDirection.INCOMING,
          messageType: MessageType.TEXT,
          content: text,
          metadata: { isSupport: true },
        });

        await ctx.reply(
          '✅ <b>Message Received!</b>\nOur support team has been notified and will reply to you shortly.',
          {
            parse_mode: 'HTML',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('⬅️ Back to Menu', 'action_menu')],
            ]),
          }
        );
        return;
      }

      // Normal message logging
      await MessageService.logMessage({
        telegramMessageId: String(ctx.message.message_id),
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.TEXT,
        content: text,
      });

      // Default polite reply
      await ctx.reply(
        'Thank you for your message. Please use the menu below to navigate:',
        getBotKeyboard()
      );
    });

    // 10. Photo Handler
    bot.on('photo', async (ctx) => {
      const user = (ctx.state as any).user;
      if (!user) return;

      const photos = ctx.message.photo;
      const largest = photos[photos.length - 1];
      const caption = ctx.message.caption || '';

      await MessageService.logMessage({
        telegramMessageId: String(ctx.message.message_id),
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.PHOTO,
        fileId: largest.file_id,
        content: caption,
      });

      await ctx.reply('📸 Photo received and saved.');
    });

    // 11. Video Handler
    bot.on('video', async (ctx) => {
      const user = (ctx.state as any).user;
      if (!user) return;

      await MessageService.logMessage({
        telegramMessageId: String(ctx.message.message_id),
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.VIDEO,
        fileId: ctx.message.video.file_id,
        content: ctx.message.caption || '',
      });

      await ctx.reply('📹 Video received.');
    });

    // 12. Document Handler
    bot.on('document', async (ctx) => {
      const user = (ctx.state as any).user;
      if (!user) return;

      await MessageService.logMessage({
        telegramMessageId: String(ctx.message.message_id),
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.DOCUMENT,
        fileId: ctx.message.document.file_id,
        content: ctx.message.caption || ctx.message.document.file_name,
      });

      await ctx.reply('📄 Document received.');
    });

    // 13. Voice & Audio Handler
    bot.on('voice', async (ctx) => {
      const user = (ctx.state as any).user;
      if (!user) return;

      await MessageService.logMessage({
        telegramMessageId: String(ctx.message.message_id),
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.VOICE,
        fileId: ctx.message.voice.file_id,
      });

      await ctx.reply('🎤 Voice message received.');
    });

    // 14. Sticker Handler
    bot.on('sticker', async (ctx) => {
      const user = (ctx.state as any).user;
      if (!user) return;

      await MessageService.logMessage({
        telegramMessageId: String(ctx.message.message_id),
        userId: user.id,
        direction: MessageDirection.INCOMING,
        messageType: MessageType.STICKER,
        fileId: ctx.message.sticker.file_id,
        content: ctx.message.sticker.emoji || null,
      });
    });

    logger.info('Telegram Bot initialized with commands and handlers.');
    return bot;
  } catch (error) {
    logger.error('Failed to initialize Telegraf bot:', error);
    return null;
  }
}

export async function startBotLifecycle() {
  if (!botInstance) {
    return;
  }

  try {
    if (config.BOT_MODE === 'webhook') {
      logger.info('Telegram Bot running in WEBHOOK mode.');
      if (config.TELEGRAM_WEBHOOK_URL) {
        await botInstance.telegram.setWebhook(config.TELEGRAM_WEBHOOK_URL, {
          secret_token: config.TELEGRAM_WEBHOOK_SECRET,
        });
        logger.info(`Webhook registered with Telegram: ${config.TELEGRAM_WEBHOOK_URL}`);
      }
    } else if (config.BOT_MODE === 'polling') {
      logger.info('Starting Telegram Bot in POLLING mode...');
      // Clear any existing webhook before polling
      await botInstance.telegram.deleteWebhook({ drop_pending_updates: true }).catch(() => {});
      botInstance.launch({
        dropPendingUpdates: true,
      });
      logger.info('Telegram Bot polling launched successfully.');
    }
  } catch (err: any) {
    logger.warn(`Notice: Telegram bot launch error (${err.message}). Check bot token if polling.`);
  }
}
