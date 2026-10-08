import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Seed Default Admin
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const existingAdmin = await prisma.admin.findFirst({
    where: {
      OR: [{ email: adminEmail }, { username: adminUsername }],
    },
  });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        username: adminUsername,
        passwordHash,
        role: 'SUPERADMIN',
      },
    });
    console.log(`✅ Default admin created: ${admin.email} (username: ${admin.username})`);
  } else {
    console.log(`ℹ️ Admin already exists: ${existingAdmin.email}`);
  }

  // 2. Seed Default Bot Settings
  const defaultSettings = [
    {
      key: 'BOT_NAME',
      value: 'Telegram Pro Bot',
      description: 'The display name of the Telegram Bot',
      isPublic: true,
    },
    {
      key: 'WELCOME_MESSAGE',
      value: '👋 Welcome to our official bot! Please select an option from the menu below to get started.',
      description: 'Message shown to users on /start',
      isPublic: true,
    },
    {
      key: 'SUPPORT_USERNAME',
      value: '@SupportAdmin',
      description: 'Telegram username of support representative',
      isPublic: true,
    },
    {
      key: 'DEFAULT_LANGUAGE',
      value: 'en',
      description: 'Default language for bot interface',
      isPublic: true,
    },
    {
      key: 'MAINTENANCE_MODE',
      value: 'false',
      description: 'When true, all user commands except admin alerts will show a maintenance warning',
      isPublic: true,
    },
    {
      key: 'REGISTRATION_ENABLED',
      value: 'true',
      description: 'Controls whether new users are allowed to register via /start',
      isPublic: true,
    },
    {
      key: 'RATE_LIMIT_PER_MINUTE',
      value: '30',
      description: 'Max requests per user per minute to prevent bot flooding',
      isPublic: false,
    },
  ];

  for (const s of defaultSettings) {
    await prisma.botSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`✅ ${defaultSettings.length} default bot settings configured.`);

  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
