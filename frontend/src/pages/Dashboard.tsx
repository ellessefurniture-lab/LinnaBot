import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  UserCheck,
  UserPlus,
  Send,
  MessageSquare,
  Activity,
  ArrowUpRight,
  Bot,
  RefreshCw,
} from 'lucide-react';
import api from '../services/api';
import { DashboardStats } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.data);
      }
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-sm font-medium">Loading telemetry & stats...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Users',
      value: stats?.users.totalUsers ?? 0,
      icon: Users,
      color: 'from-blue-600 to-indigo-600',
      badge: 'Database records',
      badgeVariant: 'info' as const,
    },
    {
      label: 'Active Users (7d)',
      value: stats?.users.activeUsers ?? 0,
      icon: UserCheck,
      color: 'from-emerald-600 to-teal-600',
      badge: 'Engaged users',
      badgeVariant: 'success' as const,
    },
    {
      label: 'New Today',
      value: stats?.users.newToday ?? 0,
      icon: UserPlus,
      color: 'from-sky-500 to-blue-600',
      badge: 'Today',
      badgeVariant: 'default' as const,
    },
    {
      label: 'New This Week',
      value: stats?.users.newThisWeek ?? 0,
      icon: Activity,
      color: 'from-violet-600 to-purple-600',
      badge: 'Last 7 days',
      badgeVariant: 'default' as const,
    },
    {
      label: 'Messages Sent',
      value: stats?.messages.outgoingCount ?? 0,
      icon: Send,
      color: 'from-amber-500 to-orange-600',
      badge: 'Outbound',
      badgeVariant: 'warning' as const,
    },
    {
      label: 'Messages Received',
      value: stats?.messages.incomingCount ?? 0,
      icon: MessageSquare,
      color: 'from-fuchsia-600 to-pink-600',
      badge: 'Inbound',
      badgeVariant: 'info' as const,
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Page Title & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">System Overview</h2>
          <p className="text-sm text-slate-400 mt-1">
            Real-time Telegram Bot metrics, user engagement, and messaging stats
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={fetchStats} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
          <Link to="/broadcasts">
            <Button size="sm" className="gap-2">
              <Send className="w-4 h-4" />
              New Broadcast
            </Button>
          </Link>
        </div>
      </div>

      {/* Bot Status Banner */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">Bot Gateway</h3>
              <Badge variant={stats?.bot.isRunning ? 'success' : 'warning'}>
                {stats?.bot.isRunning ? 'RUNNING' : 'STANDBY'}
              </Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Operating mode: <span className="text-indigo-400 font-mono uppercase">{stats?.bot.mode}</span> • Token configured:{' '}
              <span className={stats?.bot.isConfigured ? 'text-emerald-400' : 'text-rose-400'}>
                {stats?.bot.isConfigured ? 'Yes' : 'Missing'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/settings">
            <Button variant="secondary" size="sm">
              Configure Bot
            </Button>
          </Link>
          <Link to="/support">
            <Button variant="secondary" size="sm">
              Helpdesk Inbox
            </Button>
          </Link>
        </div>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800/80 shadow-lg hover:border-slate-700/80 transition-all duration-200 relative overflow-hidden group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {card.label}
                  </p>
                  <p className="text-3xl font-bold text-white mt-2">
                    {card.value.toLocaleString()}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${card.color} flex items-center justify-center text-white shadow-md shadow-indigo-900/20 group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-800/60">
                <Badge variant={card.badgeVariant} size="sm">
                  {card.badge}
                </Badge>
                <span className="text-slate-500 text-[11px]">Updated live</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 7-Day Activity Trend Visualizer */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-semibold text-white">7-Day Engagement & Volume</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Daily comparison between new users registered and total messages processed
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-slate-300">New Users</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-sky-400" />
              <span className="text-slate-300">Messages</span>
            </div>
          </div>
        </div>

        {/* CSS/SVG Bar Chart */}
        <div className="grid grid-cols-7 gap-3 h-44 items-end pt-4 pb-2 border-b border-slate-800">
          {stats?.chartData && stats.chartData.length > 0 ? (
            stats.chartData.map((item, i) => {
              const maxVal = Math.max(
                ...stats.chartData.map((d) => Math.max(d.users, d.messages)),
                5
              );
              const userHeight = Math.round((item.users / maxVal) * 100);
              const messageHeight = Math.round((item.messages / maxVal) * 100);

              return (
                <div key={i} className="flex flex-col items-center h-full justify-end group">
                  <div className="w-full flex justify-center items-end gap-1.5 h-36">
                    {/* Users bar */}
                    <div
                      style={{ height: `${Math.max(userHeight, 6)}%` }}
                      className="w-4 rounded-t-md bg-indigo-500/80 group-hover:bg-indigo-400 transition-all relative"
                      title={`New Users: ${item.users}`}
                    />
                    {/* Messages bar */}
                    <div
                      style={{ height: `${Math.max(messageHeight, 6)}%` }}
                      className="w-4 rounded-t-md bg-sky-400/80 group-hover:bg-sky-300 transition-all relative"
                      title={`Messages: ${item.messages}`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-2 font-mono">{item.date}</span>
                </div>
              );
            })
          ) : (
            <div className="col-span-7 text-center text-slate-500 text-sm py-12">
              No activity logs available for past 7 days
            </div>
          )}
        </div>
      </div>

      {/* Two Column Section: Recent Broadcasts & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Broadcasts */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Recent Broadcasts</h3>
            <Link
              to="/broadcasts"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {stats?.recentBroadcasts && stats.recentBroadcasts.length > 0 ? (
              stats.recentBroadcasts.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <h4 className="text-sm font-medium text-white truncate">{b.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Recipients: {b.totalRecipients} • Sent: {b.successfulCount}
                    </p>
                  </div>
                  <Badge
                    variant={
                      b.status === 'COMPLETED'
                        ? 'success'
                        : b.status === 'PROCESSING'
                        ? 'warning'
                        : 'default'
                    }
                    size="sm"
                  >
                    {b.status}
                  </Badge>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No broadcasts sent yet.
              </div>
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-white">Admin Activity Logs</h3>
            <Link
              to="/audit-logs"
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
            >
              View all <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="flex-1 space-y-3">
            {stats?.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-semibold text-slate-200">
                      <span className="text-indigo-400">@{log.admin?.username || 'system'}</span>{' '}
                      {log.action}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                      Entity: {log.entity} {log.entityId ? `(#${log.entityId.substring(0, 8)})` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 shrink-0">
                    {new Date(log.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500 text-xs">
                No recent activity recorded.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
