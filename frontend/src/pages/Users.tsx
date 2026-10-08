import React, { useEffect, useState } from 'react';
import {
  Search,
  Filter,
  Eye,
  Ban,
  CheckCircle,
  Trash2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
} from 'lucide-react';
import api from '../services/api';
import { User } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { useToast } from '../components/common/Toast';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Selected User Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Confirmation modal for block/delete
  const [actionModal, setActionModal] = useState<{
    type: 'block' | 'unblock' | 'delete';
    user: User;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;

      const res = await api.get('/users', { params });
      if (res.data.success) {
        setUsers(res.data.data);
        setTotal(res.data.meta.total);
      }
    } catch (e) {
      showToast('Failed to load users', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const openUserDetails = async (user: User) => {
    try {
      setSelectedUser(user);
      const res = await api.get(`/users/${user.id}`);
      if (res.data.success) {
        setSelectedUser(res.data.data);
      }
    } catch (e) {
      showToast('Failed to load user activity details', 'error');
    }
  };

  const handleConfirmAction = async () => {
    if (!actionModal) return;
    const { type, user } = actionModal;
    setActionLoading(true);

    try {
      if (type === 'block' || type === 'unblock') {
        const newStatus = type === 'block' ? 'BLOCKED' : 'ACTIVE';
        await api.patch(`/users/${user.id}`, { status: newStatus });
        showToast(`User ${type === 'block' ? 'blocked' : 'unblocked'} successfully`, 'success');
      } else if (type === 'delete') {
        await api.delete(`/users/${user.id}`);
        showToast('User record deleted successfully', 'success');
      }
      setActionModal(null);
      fetchUsers();
    } catch (e: any) {
      showToast(e.response?.data?.message || 'Action failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">User Management</h2>
          <p className="text-sm text-slate-400 mt-1">
            Browse, search, inspect activity, and manage access for all registered Telegram users
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchUsers} className="gap-2 self-start">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, name, or Telegram ID..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active Users</option>
              <option value="BLOCKED">Blocked Users</option>
            </select>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {total} user{total !== 1 ? 's' : ''} found
          </span>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950/60 text-xs uppercase font-semibold text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Telegram ID</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4">Last Active</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* User Profile */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600/40 to-sky-500/40 border border-indigo-500/30 flex items-center justify-center font-bold text-xs text-indigo-300">
                          {user.firstName?.substring(0, 1) || user.username?.substring(0, 1) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-white truncate">
                            {user.firstName || ''} {user.lastName || ''}
                          </p>
                          <p className="text-xs text-slate-400 truncate">
                            {user.username ? `@${user.username}` : 'No username'}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Telegram ID */}
                    <td className="px-6 py-4 font-mono text-xs text-sky-400">
                      {user.telegramId}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'danger'}>
                        {user.status}
                      </Badge>
                    </td>

                    {/* Date Joined */}
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    {/* Last Active */}
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {new Date(user.lastActiveAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Action buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openUserDetails(user)}
                          title="View Details"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {user.status === 'ACTIVE' ? (
                          <button
                            onClick={() => setActionModal({ type: 'block', user })}
                            title="Block User"
                            className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-colors"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActionModal({ type: 'unblock', user })}
                            title="Unblock User"
                            className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setActionModal({ type: 'delete', user })}
                          title="Delete User"
                          className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 text-sm">
                    {loading ? 'Fetching users...' : 'No users match your criteria.'}
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

      {/* User Details Modal */}
      <Modal
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        title="User Profile & Activity"
        maxWidth="2xl"
      >
        {selectedUser && (
          <div className="space-y-6">
            {/* Header profile info */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">
                  {selectedUser.firstName || ''} {selectedUser.lastName || ''}
                </h4>
                <p className="text-xs text-sky-400 font-mono mt-0.5">
                  Telegram ID: {selectedUser.telegramId}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Username: {selectedUser.username ? `@${selectedUser.username}` : 'None'} • Lang:{' '}
                  {selectedUser.languageCode || 'en'}
                </p>
              </div>
              <Badge variant={selectedUser.status === 'ACTIVE' ? 'success' : 'danger'}>
                {selectedUser.status}
              </Badge>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Joined</span>
                <span className="text-xs font-semibold text-slate-200 mt-1 block">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Last Active</span>
                <span className="text-xs font-semibold text-slate-200 mt-1 block">
                  {new Date(selectedUser.lastActiveAt).toLocaleDateString()}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-center">
                <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Total Messages</span>
                <span className="text-xs font-semibold text-indigo-400 mt-1 block">
                  {selectedUser._count?.messages ?? selectedUser.messages?.length ?? 0}
                </span>
              </div>
            </div>

            {/* Recent Message History */}
            <div>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400" />
                Recent Message Events
              </h5>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {selectedUser.messages && selectedUser.messages.length > 0 ? (
                  selectedUser.messages.map((m) => (
                    <div
                      key={m.id}
                      className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/40 text-xs flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-mono text-[10px] text-indigo-400 mr-2">
                          [{m.direction}]
                        </span>
                        <span className="text-slate-200 truncate">{m.content || `[${m.messageType}]`}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 py-3 text-center">No recent messages logged.</p>
                )}
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <Button variant="secondary" size="sm" onClick={() => setSelectedUser(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!actionModal}
        onClose={() => setActionModal(null)}
        title="Confirm User Action"
      >
        {actionModal && (
          <div className="space-y-4">
            <p className="text-sm text-slate-300">
              Are you sure you want to <b>{actionModal.type}</b> user{' '}
              <span className="text-white font-medium">
                {actionModal.user.firstName || actionModal.user.username || actionModal.user.telegramId}
              </span>
              ?
            </p>
            {actionModal.type === 'delete' && (
              <p className="text-xs text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-800/40">
                Warning: Deleting a user will permanently purge their message history and records from the database.
              </p>
            )}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setActionModal(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant={actionModal.type === 'delete' || actionModal.type === 'block' ? 'danger' : 'success'}
                size="sm"
                isLoading={actionLoading}
                onClick={handleConfirmAction}
              >
                Confirm {actionModal.type.toUpperCase()}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
