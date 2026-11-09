import React, { useState, useEffect } from 'react';
import { CreditCard, Radio, UserCheck, Search, Shield, RefreshCw, CheckCircle2, AlertCircle, Trash2, ArrowRight, UserPlus, Sparkles } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { CopyButton } from '../components/ui/CopyButton.js';
import { Modal } from '../components/ui/Modal.js';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { API_V1_URL } from '../config/api.js';
import { sounds } from '../utils/audio.js';

interface UserItem {
  id: string;
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  rfidUid: string | null;
  department?: string | null;
}

interface ScannedCardEvent {
  rfidUid: string;
  terminalId: string;
  timestamp: string;
  isRegistered: boolean;
  cardHolder?: {
    id?: string;
    name: string;
    role: string;
    studentId: string;
  } | null;
}

export const CardEnrollmentPage: React.FC = () => {
  const { socket, isConnected, terminalId } = useSocket();
  const { token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'FACULTY' | 'STUDENT'>('ALL');
  const [lastScanned, setLastScanned] = useState<ScannedCardEvent | null>(null);

  // Modal binding state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [targetUid, setTargetUid] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    document.title = 'ORCHESTRA | RFID Badge Enrollment';
    fetchUsers();
    fetchLastScanned();

    if (!socket) return;

    // Listen for live physical card scans
    const handleCardScanned = (event: ScannedCardEvent) => {
      console.log('📡 [LIVE RFID INTERCEPT]', event);
      setLastScanned(event);
      setTargetUid(event.rfidUid);
      sounds.playKeyChirp();

      setStatusMessage({
        text: `New Tag Intercepted: 0x${event.rfidUid} ${event.isRegistered ? `(Already mapped to ${event.cardHolder?.name})` : '(Ready for assignment)'}`,
        type: event.isRegistered ? 'error' : 'success',
      });
    };

    socket.on('card:scanned', handleCardScanned);

    return () => {
      socket.off('card:scanned', handleCardScanned);
    };
  }, [socket]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_V1_URL}/users`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLastScanned = async () => {
    try {
      const res = await fetch(`${API_V1_URL}/hardware/last-scanned`);
      const json = await res.json();
      if (json.success && json.data) {
        setLastScanned(json.data);
        if (!targetUid) {
          setTargetUid(json.data.rfidUid);
        }
      }
    } catch (err) {
      // Non-critical ping
    }
  };

  const handleAssignCard = async (userId: string, rfidUid: string) => {
    if (!rfidUid.trim()) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/users/${userId}/rfid`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rfidUid: rfidUid.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        sounds.playSuccessChime();
        setStatusMessage({ text: json.message, type: 'success' });
        setSelectedUser(null);
        await fetchUsers();
      } else {
        sounds.playErrorBuzz();
        setStatusMessage({ text: json.message || 'Failed to assign card', type: 'error' });
      }
    } catch (err: any) {
      sounds.playErrorBuzz();
      setStatusMessage({ text: err.message || 'Error assigning RFID card', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCard = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to remove the badge UID from ${user.firstName} ${user.lastName}?`)) {
      return;
    }
    try {
      const res = await fetch(`${API_V1_URL}/users/${user.id}/rfid`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        sounds.playSuccessChime();
        setStatusMessage({ text: json.message, type: 'success' });
        await fetchUsers();
      }
    } catch (err: any) {
      console.error('Error removing RFID badge:', err);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.studentId.toLowerCase().includes(q) ||
      (u.rfidUid && u.rfidUid.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-sky-400 shrink-0" />
            <span className="truncate">RFID Badge Enrollment &amp; Provisioning Matrix</span>
          </h1>
          <p className="text-xs text-slate-400 font-body mt-1">
            Intercept live physical card taps from terminal <span className="font-mono text-sky-400 font-semibold">{terminalId}</span> and provision credentials directly into PostgreSQL.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchUsers();
            fetchLastScanned();
            sounds.playKeyChirp();
          }}
          disabled={isLoading}
          className="flex items-center gap-2 shrink-0 whitespace-nowrap self-start sm:self-center"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-sky-400' : ''}`} />
          <span>Refresh Directory</span>
        </Button>
      </div>

      {/* Live Physical Intercept Banner */}
      <div className="bg-slate-900/60 border border-white/[0.06] rounded-2xl p-4 sm:p-5 backdrop-blur-sm shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-2.5 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400 shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-sky-400">
                  Live Hardware Intercept
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {isConnected ? 'LISTENING TO TERMINAL' : 'CONNECTING...'}
                </span>
              </div>

              {lastScanned ? (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Last Scanned Card:</span>
                  <span className="font-mono text-sm font-extrabold text-white bg-slate-950 px-2.5 py-0.5 rounded-lg border border-white/[0.08] tracking-widest">
                    0x{lastScanned.rfidUid}
                  </span>
                  <CopyButton text={lastScanned.rfidUid} />

                  {lastScanned.isRegistered && lastScanned.cardHolder ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Mapped to {lastScanned.cardHolder.name} ({lastScanned.cardHolder.role})
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Unassigned Tag (Ready to Bind)
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-body mt-1">
                  Tap any physical card or fob on your ESP32 terminal to immediately capture its UID here.
                </p>
              )}
            </div>
          </div>

          {/* Quick Manual / Scanned UID Input */}
          <div className="flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder="Enter or Tap UID (e.g. 892B2E8E)"
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value.toUpperCase())}
              className="w-56 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-white/[0.08] bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
            />
          </div>
        </div>

        {statusMessage && (
          <div
            className={`mt-3 text-xs p-2.5 rounded-xl border flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Directory & Management Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
        {/* Table Header Strip */}
        <div className="p-4 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Institutional Directory &amp; Badge Assignment Table</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Provision physical RFID badges to registered students and faculty.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono self-start sm:self-center">{filteredUsers.length} Users</span>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-4 border-b border-white/[0.05] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.01]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, ID, or RFID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-white/[0.08] bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-xl border border-white/[0.06] self-start sm:self-auto">
            {(['ALL', 'FACULTY', 'STUDENT'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setRoleFilter(tab)}
                className={`px-3 py-1 text-[11px] font-medium rounded-lg transition-all ${
                  roleFilter === tab
                    ? 'bg-slate-800 text-sky-400 border border-white/[0.08] shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01] text-slate-400 font-mono uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4 font-medium">Role</th>
                <th className="py-2.5 px-4 font-medium">Full Name</th>
                <th className="py-2.5 px-4 font-medium">Institutional ID</th>
                <th className="py-2.5 px-4 font-medium">Assigned RFID Badge</th>
                <th className="py-2.5 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const isCurrentTagHolder = lastScanned?.rfidUid && u.rfidUid === lastScanned.rfidUid;

                return (
                  <tr
                    key={u.id}
                    className={`transition-colors hover:bg-white/[0.02] ${
                      isCurrentTagHolder ? 'bg-sky-500/[0.06]' : ''
                    }`}
                  >
                    <td className="py-3 px-4 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
                          u.role === 'FACULTY'
                            ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20'
                            : u.role === 'ADMIN'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : 'bg-sky-500/10 text-sky-300 border border-sky-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-4 align-middle">
                      <div className="font-bold text-white">
                        {u.lastName}, {u.firstName}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-300 align-middle">
                      {u.studentId || <span className="text-slate-600">—</span>}
                    </td>

                    <td className="py-3 px-4 align-middle">
                      {u.rfidUid ? (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-xs bg-slate-950 px-2 py-0.5 rounded-lg border border-white/[0.08] tracking-wider text-white">
                            0x{u.rfidUid}
                          </span>
                          <CopyButton text={u.rfidUid} />
                        </div>
                      ) : (
                        <span className="font-mono text-[11px] text-slate-500 italic">
                          (No badge bound)
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right align-middle">
                      <div className="flex items-center justify-end gap-1.5">
                        {targetUid && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAssignCard(u.id, targetUid)}
                            disabled={isSubmitting || u.rfidUid === targetUid}
                            className="text-[11px] px-2.5 py-1 flex items-center gap-1"
                            title={`Assign current UID (0x${targetUid}) to this user`}
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Bind 0x{targetUid}</span>
                          </Button>
                        )}

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(u);
                            setTargetUid(u.rfidUid || lastScanned?.rfidUid || '');
                          }}
                          className="text-[11px] px-2.5 py-1"
                        >
                          <span>Edit</span>
                        </Button>

                        {u.rfidUid && (
                          <button
                            onClick={() => handleRemoveCard(u)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors rounded-lg hover:bg-rose-500/10"
                            title="Unbind RFID Badge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual / Edit Modal */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedUser(null)}
          title={`Edit RFID Assignment: ${selectedUser.firstName} ${selectedUser.lastName}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-950 rounded-xl border border-white/[0.06] text-xs space-y-1">
              <div>
                <span className="text-slate-400 font-mono">Role:</span>{' '}
                <span className="font-bold text-white">{selectedUser.role}</span>
              </div>
              <div>
                <span className="text-slate-400 font-mono">Institutional ID:</span>{' '}
                <span className="font-mono font-bold text-sky-400">{selectedUser.studentId || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 font-mono">Current Badge:</span>{' '}
                <span className="font-mono text-slate-200">{selectedUser.rfidUid ? `0x${selectedUser.rfidUid}` : 'None'}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white">
                Target RFID Tag UID (8 Hex Characters)
              </label>
              <input
                type="text"
                placeholder="e.g. 892B2E8E"
                value={targetUid}
                onChange={(e) => setTargetUid(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 text-sm font-mono font-bold uppercase rounded-xl border border-white/[0.08] bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
              />
              <p className="text-[11px] text-slate-400">
                Tip: You can also tap the physical card directly on your ESP32 reader to auto-fill this field.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedUser(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleAssignCard(selectedUser.id, targetUid)}
                disabled={isSubmitting || !targetUid.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Save Badge Assignment'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CardEnrollmentPage;
