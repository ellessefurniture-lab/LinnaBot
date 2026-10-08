import React, { useEffect, useState } from 'react';
import {
  Headphones,
  Search,
  Send,
  CheckCircle,
  User,
  RefreshCw,
  Shield,
} from 'lucide-react';
import api from '../services/api';
import { SupportConversation, SupportStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/Toast';

export const SupportPage: React.FC = () => {
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<SupportConversation | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('OPEN');
  const [search, setSearch] = useState('');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(false);
  const [replying, setReplying] = useState(false);
  const { showToast } = useToast();

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const params: any = { page: 1, limit: 25 };
      if (statusFilter) params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const res = await api.get('/support', { params });
      if (res.data.success) {
        setConversations(res.data.data);
        // If an active conversation was selected, refresh its details
        if (selectedConv) {
          const updated = res.data.data.find((c: any) => c.id === selectedConv.id);
          if (updated) loadConversationDetails(updated.id);
        } else if (res.data.data.length > 0) {
          loadConversationDetails(res.data.data[0].id);
        }
      }
    } catch (e) {
      showToast('Failed to load support threads', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationDetails = async (id: string) => {
    try {
      const res = await api.get(`/support/${id}`);
      if (res.data.success) {
        setSelectedConv(res.data.data);
      }
    } catch (e) {
      showToast('Failed to load thread messages', 'error');
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [statusFilter]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConv || !replyText.trim()) return;

    try {
      setReplying(true);
      const res = await api.post(`/support/${selectedConv.id}/reply`, {
        content: replyText.trim(),
      });

      if (res.data.success) {
        showToast('Reply sent to user via Telegram!', 'success');
        setReplyText('');
        loadConversationDetails(selectedConv.id);
        fetchConversations();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to dispatch reply', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleToggleStatus = async (newStatus: SupportStatus) => {
    if (!selectedConv) return;
    try {
      await api.patch(`/support/${selectedConv.id}/status`, { status: newStatus });
      showToast(`Conversation marked as ${newStatus.toLowerCase()}`, 'success');
      loadConversationDetails(selectedConv.id);
      fetchConversations();
    } catch (e) {
      showToast('Failed to update status', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Helpdesk & Support Center</h2>
          <p className="text-sm text-slate-400 mt-1">
            Direct two-way messaging with Telegram users inquiring through the bot
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchConversations} className="gap-2 self-start">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Two Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[720px]">
        {/* Left Pane: Conversations List (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          {/* Filter Bar */}
          <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="OPEN">Open Tickets</option>
              <option value="RESOLVED">Resolved Tickets</option>
              <option value="">All Tickets</option>
            </select>

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchConversations()}
                placeholder="Search user..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Conversations Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/80">
            {conversations.length > 0 ? (
              conversations.map((conv) => {
                const isSelected = selectedConv?.id === conv.id;
                return (
                  <button
                    key={conv.id}
                    onClick={() => loadConversationDetails(conv.id)}
                    className={`w-full text-left p-4 transition-colors flex items-start gap-3 ${
                      isSelected
                        ? 'bg-indigo-600/10 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 shrink-0">
                      {conv.user.firstName?.substring(0, 1) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-white truncate">
                          {conv.user.firstName || conv.user.username || 'User'}
                        </h4>
                        <span className="text-[10px] text-slate-500">
                          {new Date(conv.lastMessageAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {conv.messages?.[0]?.content || conv.subject || 'New inquiry'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={conv.status === 'OPEN' ? 'warning' : 'success'} size="sm">
                          {conv.status}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono">
                          ID: {conv.user.telegramId}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                {loading ? 'Loading tickets...' : 'No conversations found.'}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Active Thread Chat View (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-xl">
          {selectedConv ? (
            <>
              {/* Thread Header */}
              <div className="p-4 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                    {selectedConv.user.firstName?.substring(0, 1) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {selectedConv.user.firstName || ''} {selectedConv.user.lastName || ''}
                      {selectedConv.user.username ? ` (@${selectedConv.user.username})` : ''}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Telegram ID: {selectedConv.user.telegramId}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConv.status === 'OPEN' ? (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => handleToggleStatus('RESOLVED')}
                      className="gap-1.5 text-xs py-1"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Resolve Ticket
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleToggleStatus('OPEN')}
                      className="gap-1.5 text-xs py-1"
                    >
                      Reopen Ticket
                    </Button>
                  )}
                </div>
              </div>

              {/* Chat Messages Body */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/40">
                {selectedConv.messages && selectedConv.messages.length > 0 ? (
                  selectedConv.messages.map((msg) => {
                    const isAdmin = msg.senderType === 'ADMIN';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-3 shadow-md text-xs leading-relaxed ${
                            isAdmin
                              ? 'bg-indigo-600 text-white rounded-tr-sm'
                              : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-sm'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 mb-1 opacity-75 text-[10px] font-semibold">
                            {isAdmin ? (
                              <>
                                <Shield className="w-3 h-3" /> Support Agent
                              </>
                            ) : (
                              <>
                                <User className="w-3 h-3" /> User
                              </>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <span className="text-[9px] opacity-60 block text-right mt-1">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-slate-500 text-xs py-12">
                    No message history in this ticket.
                  </div>
                )}
              </div>

              {/* Reply Input Bar */}
              <form
                onSubmit={handleSendReply}
                className="p-3 border-t border-slate-800 bg-slate-900/90 flex items-center gap-2"
              >
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a response to send to the user's Telegram..."
                  className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button
                  type="submit"
                  size="sm"
                  isLoading={replying}
                  disabled={!replyText.trim()}
                  className="gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  Send Reply
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Headphones className="w-12 h-12 text-slate-600 mb-3" />
              <h4 className="text-sm font-semibold text-slate-400">Select a Conversation</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs">
                Pick a ticket from the left panel to review inquiries and send live replies
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
