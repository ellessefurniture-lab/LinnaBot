import { Request, Response } from 'express';
import { z } from 'zod';
import { SettingsService } from '../services/settingsService';
import { sendSuccess } from '../utils/apiResponse';
import { logAdminAction } from '../middleware/auditLogger';

export const updateSettingsSchema = z.object({
  settings: z.record(z.string()),
});

export class SettingsController {
  static async getSettings(req: Request, res: Response) {
    const settings = await SettingsService.getAllSettings(true);

    // Transform to key-value map and mask sensitive values
    const responseData = settings.map((s) => {
      let val = s.value;
      if (s.key.includes('SECRET') || s.key.includes('TOKEN') || s.key.includes('PASSWORD')) {
        val = s.value ? '••••••••••••••••' : '';
      }
      return {
        key: s.key,
        value: val,
        description: s.description,
        isPublic: s.isPublic,
        updatedAt: s.updatedAt,
      };
    });

    return sendSuccess(res, responseData, 'Settings retrieved');
  }

  static async updateSettings(req: Request, res: Response) {
    const { settings } = req.body;

    // Filter out masked placeholders so we don't accidentally overwrite with dots
    const cleanSettings: Record<string, string> = {};
    for (const [key, val] of Object.entries(settings)) {
      if (val !== '••••••••••••••••') {
        cleanSettings[key] = String(val);
      }
    }

    await SettingsService.updateMultipleSettings(cleanSettings);
    await logAdminAction(req, 'UPDATE_SETTINGS', 'BotSetting', undefined, { updatedKeys: Object.keys(cleanSettings) });

    return sendSuccess(res, cleanSettings, 'Settings updated successfully');
  }
}
