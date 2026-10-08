import React, { useEffect, useState } from 'react';
import {
  Save,
  Bot,
  Shield,
  Key,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { BotSetting } from '../types';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const SettingsPage: React.FC = () => {
  const [settingsMap, setSettingsMap] = useState<Record<string, string>>({
    BOT_NAME: 'Telegram Pro Bot',
    WELCOME_MESSAGE: '👋 Welcome to our bot!\n\nPlease choose an option from the menu below:',
    SUPPORT_USERNAME: '@SupportAdmin',
    DEFAULT_LANGUAGE: 'en',
    MAINTENANCE_MODE: 'false',
    REGISTRATION_ENABLED: 'true',
    TELEGRAM_BOT_TOKEN: '••••••••••••••••',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data.success) {
        const map: Record<string, string> = {};
        res.data.data.forEach((s: BotSetting) => {
          map[s.key] = s.value;
        });
        setSettingsMap((prev) => ({ ...prev, ...map }));
      }
    } catch (e) {
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleChange = (key: string, value: string) => {
    setSettingsMap((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.patch('/settings', { settings: settingsMap });
      if (res.data.success) {
        showToast('Settings saved successfully!', 'success');
        fetchSettings();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Configuration</h2>
          <p className="text-sm text-slate-400 mt-1">
            Configure bot identity, welcome greetings, support handles, and operational modes
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchSettings}
          className="gap-2 self-start"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Reload
        </Button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Bot Identity */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Bot className="w-4 h-4 text-indigo-400" />
            Bot Identity & Display
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Bot Display Name
              </label>
              <input
                type="text"
                value={settingsMap.BOT_NAME || ''}
                onChange={(e) => handleChange('BOT_NAME', e.target.value)}
                placeholder="Telegram Pro Bot"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Support Representative Handle
              </label>
              <input
                type="text"
                value={settingsMap.SUPPORT_USERNAME || ''}
                onChange={(e) => handleChange('SUPPORT_USERNAME', e.target.value)}
                placeholder="@SupportAdmin"
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Default System Language
            </label>
            <select
              value={settingsMap.DEFAULT_LANGUAGE || 'en'}
              onChange={(e) => handleChange('DEFAULT_LANGUAGE', e.target.value)}
              className="w-full md:w-64 px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="en">English (en)</option>
              <option value="es">Spanish (es)</option>
              <option value="ru">Russian (ru)</option>
              <option value="zh">Chinese (zh)</option>
              <option value="km">Khmer (km)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Welcome Greeting (/start message)
            </label>
            <textarea
              rows={4}
              value={settingsMap.WELCOME_MESSAGE || ''}
              onChange={(e) => handleChange('WELCOME_MESSAGE', e.target.value)}
              placeholder="Message sent when users start the bot..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Operational Modes & Toggles */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Shield className="w-4 h-4 text-emerald-400" />
            Operational & Access Controls
          </h3>

          <div className="space-y-4">
            {/* Maintenance Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div>
                <p className="text-sm font-semibold text-white">Maintenance Mode</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  When enabled, all user commands respond with a temporary maintenance notice
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleChange(
                    'MAINTENANCE_MODE',
                    settingsMap.MAINTENANCE_MODE === 'true' ? 'false' : 'true'
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settingsMap.MAINTENANCE_MODE === 'true' ? 'bg-amber-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settingsMap.MAINTENANCE_MODE === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Registration Enabled Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/40 border border-slate-700/40">
              <div>
                <p className="text-sm font-semibold text-white">New User Registration</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Allow new users sending /start to be automatically registered in the system
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleChange(
                    'REGISTRATION_ENABLED',
                    settingsMap.REGISTRATION_ENABLED === 'true' ? 'false' : 'true'
                  )
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  settingsMap.REGISTRATION_ENABLED === 'true' ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settingsMap.REGISTRATION_ENABLED === 'true' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Telegram API Secrets (Secure & Masked) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 border-b border-slate-800 pb-3">
            <Key className="w-4 h-4 text-sky-400" />
            Telegram Credentials (Secure Server Config)
          </h3>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Telegram Bot Token (from BotFather)
            </label>
            <input
              type="password"
              value={settingsMap.TELEGRAM_BOT_TOKEN || ''}
              onChange={(e) => handleChange('TELEGRAM_BOT_TOKEN', e.target.value)}
              placeholder="Paste new bot token to update..."
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Tokens are never revealed in plain text. Leave as dots to retain existing token.
            </p>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={saving} className="gap-2 px-6 py-2.5 shadow-lg">
            <Save className="w-4 h-4" />
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
};
