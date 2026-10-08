import React, { useEffect, useState } from 'react';
import {
  Send,
  Plus,
  CheckCircle2,
  Users,
  Eye,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import api from '../services/api';
import {
  Broadcast,
  InlineButton,
  MediaType,
  ParseMode,
  TargetAudience,
} from '../types';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';
import { TelegramPreview } from '../components/telegram/TelegramPreview';

export const BroadcastsPage: React.FC = () => {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // New Broadcast Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mediaType, setMediaType] = useState<MediaType>('NONE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [parseMode, setParseMode] = useState<ParseMode>('HTML');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('ALL');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [buttons, setButtons] = useState<InlineButton[]>([]);

  // Audience Count & Confirmation Modal
  const [estimatedAudience, setEstimatedAudience] = useState<number | null>(null);
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // View Details Modal
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);

  const { showToast } = useToast();

  const fetchBroadcasts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/broadcasts', { params: { page, limit: 10 } });
      if (res.data.success) {
        setBroadcasts(res.data.data);
        setTotal(res.data.meta.total);
      }
    } catch (e) {
      showToast('Failed to load broadcasts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts();
  }, [page]);

  // Fetch estimated target count whenever audience selection changes
  const fetchEstimate = async (audience: TargetAudience) => {
    try {
      setEstimateLoading(true);
      const res = await api.get('/broadcasts/estimate-target', {
        params: { targetAudience: audience },
      });
      if (res.data.success) {
        setEstimatedAudience(res.data.data.count);
      }
    } catch (e) {
    } finally {
      setEstimateLoading(false);
    }
  };

  useEffect(() => {
    if (isCreateOpen) {
      fetchEstimate(targetAudience);
    }
  }, [targetAudience, isCreateOpen]);

  const handleAddButton = () => {
    if (buttons.length >= 5) {
      showToast('Maximum 5 inline buttons allowed', 'info');
      return;
    }
    setButtons([...buttons, { text: 'New Button', url: 'https://' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: 'text' | 'url', value: string) => {
    const updated = [...buttons];
    updated[index][field] = value;
    setButtons(updated);
  };

  const handlePrepareSend = () => {
    if (!title.trim() || !content.trim()) {
      showToast('Please provide both title and message content', 'error');
      return;
    }
    if (mediaType !== 'NONE' && mediaUrl && !mediaUrl.startsWith('http')) {
      showToast('Media URL must start with http:// or https://', 'error');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSend = async () => {
    try {
      setSubmitLoading(true);
      const payload: any = {
        title,
        content,
        mediaType,
        mediaUrl: mediaUrl.trim() || null,
        parseMode,
        targetAudience,
        buttons: buttons.length > 0 ? buttons : null,
        scheduledAt: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      const res = await api.post('/broadcasts', payload);
      if (res.data.success) {
        showToast(
          isScheduled
            ? 'Broadcast scheduled successfully!'
            : 'Broadcast queued for background transmission!',
          'success'
        );
        setIsConfirmOpen(false);
        setIsCreateOpen(false);
        resetForm();
        fetchBroadcasts();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to dispatch broadcast', 'error');
    } finally {
      setSubmitLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setContent('');
    setMediaType('NONE');
    setMediaUrl('');
    setParseMode('HTML');
    setTargetAudience('ALL');
    setIsScheduled(false);
    setScheduledAt('');
    setButtons([]);
  };

  const openDetails = async (id: string) => {
    try {
      const res = await api.get(`/broadcasts/${id}`);
      if (res.data.success) {
        setSelectedBroadcast(res.data.data);
      }
    } catch (e) {
      showToast('Failed to load broadcast details', 'error');
    }
  };

  const handleCancelBroadcast = async (id: string) => {
    try {
      await api.post(`/broadcasts/${id}/cancel`);
      showToast('Broadcast cancelled', 'success');
      fetchBroadcasts();
      if (selectedBroadcast?.id === id) {
        setSelectedBroadcast(null);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to cancel', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Broadcast Center</h2>
          <p className="text-sm text-slate-400 mt-1">
            Create rich announcements, schedule deliveries, and review dispatch performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchBroadcasts} className="gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            New Broadcast
          </Button>
        </div>
      </div>

      {/* Broadcast History Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Broadcast History & Transmission Logs</h3>
          <span className="text-xs text-slate-400 font-mono">{total} total campaigns</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Campaign Title</th>
                <th className="px-6 py-4">Audience</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Delivery Progress</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {broadcasts.length > 0 ? (
                broadcasts.map((b) => {
                  const percent =
                    b.totalRecipients > 0
                      ? Math.round(((b.successfulCount + b.failedCount) / b.totalRecipients) * 100)
                      : 0;

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="font-semibold text-white truncate">{b.title}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{b.content}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="info" size="sm">
                          {b.targetAudience}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            b.status === 'COMPLETED'
                              ? 'success'
                              : b.status === 'PROCESSING'
                              ? 'warning'
                              : b.status === 'CANCELLED'
                              ? 'danger'
                              : 'default'
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-40">
                          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                            <span className="text-emerald-400">✓ {b.successfulCount}</span>
                            {b.failedCount > 0 && (
                              <span className="text-rose-400">✕ {b.failedCount}</span>
                            )}
                            <span className="font-mono text-[11px]">/ {b.totalRecipients}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openDetails(b.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title="View Campaign Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {(b.status === 'SCHEDULED' || b.status === 'DRAFT') && (
                            <button
                              onClick={() => handleCancelBroadcast(b.id)}
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                              title="Cancel Scheduled Broadcast"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {loading ? 'Loading broadcasts...' : 'No broadcasts sent yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {page} of {Math.ceil(total / 10) || 1}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={page >= (Math.ceil(total / 10) || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* CREATE BROADCAST MODAL (Split View: Form & Live Telegram Preview) */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Compose Telegram Broadcast"
        maxWidth="4xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form Side (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Campaign Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. System Upgrade Notice"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Target Audience Selector */}
            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-400" />
                  Target Audience
                </label>
                <span className="text-xs font-medium text-emerald-400">
                  {estimateLoading
                    ? 'Estimating...'
                    : `${estimatedAudience ?? 0} eligible users`}
                </span>
              </div>
              <select
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value as TargetAudience)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Active Users (Excluding blocked)</option>
                <option value="ACTIVE">Active Users (Engaged past 7 days)</option>
                <option value="INACTIVE">Inactive Users (Dormant 30+ days)</option>
                <option value="NEW_USERS">New Users (Registered past 7 days)</option>
              </select>
            </div>

            {/* Media Options */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Media Attachment
                </label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as MediaType)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="NONE">None (Text Only)</option>
                  <option value="PHOTO">Photo / Image</option>
                  <option value="VIDEO">Video</option>
                  <option value="DOCUMENT">Document</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Format Mode
                </label>
                <select
                  value={parseMode}
                  onChange={(e) => setParseMode(e.target.value as ParseMode)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="HTML">HTML Formatting</option>
                  <option value="MARKDOWN">Markdown Formatting</option>
                  <option value="PLAIN">Plain Text</option>
                </select>
              </div>
            </div>

            {mediaType !== 'NONE' && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                  Media Public URL
                </label>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            {/* Message Content */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                Message Content *
              </label>
              <textarea
                rows={5}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message here... Supported tags: <b>bold</b>, <i>italic</i>, <code>code</code>, <a href='...'>link</a>"
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Inline Buttons Builder */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Interactive Buttons ({buttons.length}/5)
                </label>
                <button
                  type="button"
                  onClick={handleAddButton}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Button
                </button>
              </div>

              {buttons.map((btn, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => handleButtonChange(idx, 'text', e.target.value)}
                    placeholder="Button text"
                    className="w-1/2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="text"
                    value={btn.url || ''}
                    onChange={(e) => handleButtonChange(idx, 'url', e.target.value)}
                    placeholder="URL (https://...)"
                    className="w-1/2 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveButton(idx)}
                    className="p-1 text-slate-500 hover:text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Schedule Delivery Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Schedule broadcast for a future date & time</span>
              </label>

              {isScheduled && (
                <div className="mt-2">
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handlePrepareSend} className="gap-2">
                <Send className="w-4 h-4" />
                Proceed to Confirmation
              </Button>
            </div>
          </div>

          {/* Live Telegram Preview Side (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-sky-400" />
              Live Telegram App Simulator
            </span>
            <TelegramPreview
              title={title}
              content={content}
              mediaType={mediaType}
              mediaUrl={mediaUrl}
              buttons={buttons}
            />
          </div>
        </div>
      </Modal>

      {/* PRE-FLIGHT CONFIRMATION MODAL */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Confirm Campaign Dispatch"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/40 flex items-start gap-3">
            <Send className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-white">Broadcast Ready</h4>
              <p className="text-xs text-slate-300 mt-1">
                You are about to send campaign <b>"{title}"</b> to{' '}
                <span className="text-emerald-400 font-bold">
                  {estimatedAudience ?? 0} Telegram users
                </span>
                .
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-400 bg-slate-800/40 p-3 rounded-xl border border-slate-700/40 font-mono">
            <p>• Target Audience: {targetAudience}</p>
            <p>• Format: {parseMode}</p>
            <p>• Media: {mediaType}</p>
            <p>
              • Delivery:{' '}
              {isScheduled && scheduledAt
                ? `Scheduled for ${new Date(scheduledAt).toLocaleString()}`
                : 'Immediate background queue (throttled at 25 msgs/sec)'}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsConfirmOpen(false)}
              disabled={submitLoading}
            >
              Back to Edit
            </Button>
            <Button
              size="sm"
              isLoading={submitLoading}
              onClick={handleConfirmSend}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm & Launch
            </Button>
          </div>
        </div>
      </Modal>

      {/* BROADCAST DETAILS MODAL */}
      <Modal
        isOpen={!!selectedBroadcast}
        onClose={() => setSelectedBroadcast(null)}
        title="Campaign Details & Recipient Log"
        maxWidth="2xl"
      >
        {selectedBroadcast && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold text-white">{selectedBroadcast.title}</h4>
                <Badge
                  variant={
                    selectedBroadcast.status === 'COMPLETED'
                      ? 'success'
                      : selectedBroadcast.status === 'PROCESSING'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {selectedBroadcast.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-300 mt-2 font-mono whitespace-pre-wrap bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                {selectedBroadcast.content}
              </p>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="text-[11px] text-slate-400 block">Total Recipients</span>
                <span className="text-base font-bold text-white mt-1 block">
                  {selectedBroadcast.totalRecipients}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="text-[11px] text-emerald-400 block">Successful</span>
                <span className="text-base font-bold text-emerald-400 mt-1 block">
                  {selectedBroadcast.successfulCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
                <span className="text-[11px] text-rose-400 block">Failed</span>
                <span className="text-base font-bold text-rose-400 mt-1 block">
                  {selectedBroadcast.failedCount}
                </span>
              </div>
            </div>

            {/* Recipient Log Breakdown */}
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Recipient Transmission Sample
              </h5>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {selectedBroadcast.recipients && selectedBroadcast.recipients.length > 0 ? (
                  selectedBroadcast.recipients.map((r) => (
                    <div
                      key={r.id}
                      className="p-2 rounded-lg bg-slate-800/40 border border-slate-700/40 text-xs flex items-center justify-between"
                    >
                      <span className="text-slate-200">
                        {r.user.firstName || r.user.username} ({r.user.telegramId})
                      </span>
                      <div className="flex items-center gap-2">
                        {r.errorMessage && (
                          <span className="text-[11px] text-rose-400">{r.errorMessage}</span>
                        )}
                        <Badge
                          variant={r.status === 'SENT' ? 'success' : r.status === 'FAILED' ? 'danger' : 'default'}
                          size="sm"
                        >
                          {r.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">No individual recipient records.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setSelectedBroadcast(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
