import { prisma } from '../utils/prisma';

export class SettingsService {
  private static cache: Map<string, string> = new Map();
  private static lastCacheUpdate = 0;
  private static CACHE_TTL_MS = 30000; // 30 seconds

  static async getAllSettings(includePrivate = false) {
    const settings = await prisma.botSetting.findMany({
      where: includePrivate ? {} : { isPublic: true },
      orderBy: { key: 'asc' },
    });
    return settings;
  }

  static async getSetting(key: string, defaultValue = ''): Promise<string> {
    const now = Date.now();
    if (this.cache.has(key) && now - this.lastCacheUpdate < this.CACHE_TTL_MS) {
      return this.cache.get(key) ?? defaultValue;
    }

    const item = await prisma.botSetting.findUnique({
      where: { key },
    });

    if (item) {
      this.cache.set(key, item.value);
      this.lastCacheUpdate = now;
      return item.value;
    }

    return defaultValue;
  }

  static async updateSetting(key: string, value: string, description?: string) {
    const updated = await prisma.botSetting.upsert({
      where: { key },
      update: {
        value,
        ...(description ? { description } : {}),
      },
      create: {
        key,
        value,
        description: description || null,
        isPublic: true,
      },
    });

    this.cache.set(key, value);
    return updated;
  }

  static async updateMultipleSettings(settings: Record<string, string>) {
    const updates = Object.entries(settings).map(([key, value]) =>
      prisma.botSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value, isPublic: true },
      })
    );

    const result = await prisma.$transaction(updates);
    for (const [k, v] of Object.entries(settings)) {
      this.cache.set(k, v);
    }
    return result;
  }

  static invalidateCache() {
    this.cache.clear();
    this.lastCacheUpdate = 0;
  }
}
