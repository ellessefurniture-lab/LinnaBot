import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  FileText,
  Image,
  Video,
  Mic,
  Smile,
} from 'lucide-react';
import api from '../services/api';
import { Message, MessageType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (search.trim()) params.search = search.trim();
      if (directionFilter) params.direction = directionFilter;
      if (typeFilter) params.messageType = typeFilter;

      const res = await api.get('/messages', { params });
      if (res.data.success) {
        setMessages(res.data.data);
        setTotal(res.data.meta.total);
      }
    } catch (e) {
      showToast('Failed to load message event logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [page, directionFilter, typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMessages();
  };

  const getTypeIcon = (type: MessageType) => {
    switch (type) {
      case 'PHOTO':
        return <Image className="w-4 h-4 text-sky-400" />;
      case 'VIDEO':
        return <Video className="w-4 h-4 text-indigo-400" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-emerald-400" />;
      case 'VOICE':
      case 'AUDIO':
        return <Mic className="w-4 h-4 text-amber-400" />;
      case 'STICKER':
        return <Smile className="w-4 h-4 text-pink-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-400" />;
    }
  };

  const totalPages = Math.ceil(total / 20) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Message Stream & Logs</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time audit log of all incoming inquiries, automated replies, and outbound communications
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchMessages} className="gap-2 self-start">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search message text content..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Direction Filter */}
          <select
            value={directionFilter}
            onChange={(e) => {
              setDirectionFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Directions</option>
            <option value="INCOMING">Incoming ⬇️</option>
            <option value="OUTGOING">Outgoing ⬆️</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Media Types</option>
            <option value="TEXT">Text</option>
            <option value="PHOTO">Photo</option>
            <option value="VIDEO">Video</option>
            <option value="DOCUMENT">Document</option>
            <option value="VOICE">Voice</option>
            <option value="CALLBACK_QUERY">Callback Query</option>
          </select>

          <span className="text-xs text-slate-400 font-mono">
            {total} message{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Messages Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Flow</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Content / Payload</th>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {messages.length > 0 ? (
                messages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Flow / Direction */}
                    <td className="px-6 py-4">
                      {m.direction === 'INCOMING' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-400 bg-sky-950/50 px-2.5 py-1 rounded-full border border-sky-800/50">
                          <ArrowDownLeft className="w-3.5 h-3.5" /> Inbound
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 bg-indigo-950/50 px-2.5 py-1 rounded-full border border-indigo-800/50">
                          <ArrowUpRight className="w-3.5 h-3.5" /> Outbound
                        </span>
                      )}
                    </td>

                    {/* User */}
                    <td className="px-6 py-4">
                      {m.user ? (
                        <div>
                          <p className="font-medium text-white text-xs">
                            {m.user.firstName || m.user.username || 'User'}
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            ID: {m.user.telegramId}
                          </p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-500">Unknown</span>
                      )}
                    </td>

                    {/* Type */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                        {getTypeIcon(m.messageType)}
                        <span>{m.messageType}</span>
                      </div>
                    </td>

                    {/* Content */}
                    <td className="px-6 py-4">
                      <div className="max-w-md">
                        <p className="text-xs text-slate-200 line-clamp-2 font-mono break-all">
                          {m.content || <span className="text-slate-500 italic">No text payload</span>}
                        </p>
                        {m.fileId && (
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate">
                            FileID: {m.fileId}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Timestamp */}
                    <td className="px-6 py-4 text-xs text-slate-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge variant="success" size="sm">
                        {m.status}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {loading ? 'Fetching messages...' : 'No message records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
        <div className="px-6 py-3.5 bg-slate-950/40 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Page {page} of {totalPages}
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
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
