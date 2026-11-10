import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Radio,
  UserCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Sparkles,
  Wifi,
  SquareTerminal,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button.js';
import { CopyButton } from '../components/ui/CopyButton.js';
import { Modal } from '../components/ui/Modal.js';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
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
  targetRole?: string;
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
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'FACULTY' | 'STUDENT'>('ALL');

  // Live Hardware Enrollment State
  const [isEnrollmentActive, setIsEnrollmentActive] = useState<boolean>(false);
  const [enrollmentTarget, setEnrollmentTarget] = useState<{ role: string; name?: string } | null>(null);
  const [liveCapturedTag, setLiveCapturedTag] = useState<{
    uid: string;
    isRegistered: boolean;
    holderName?: string;
  } | null>(null);

  // Modal binding state
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [targetUid, setTargetUid] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    document.title = 'ORCHESTRA | RFID Badge Enrollment';
    fetchUsers();

    if (!socket) return;

    // Listen for live physical card scans
    const handleCardScanned = (event: ScannedCardEvent) => {
      setLiveCapturedTag({
        uid: event.rfidUid,
        isRegistered: event.isRegistered,
        holderName: event.cardHolder?.name,
      });
      setTargetUid(event.rfidUid);
      sounds.playKeyChirp();

      setStatusMessage({
        text: `Live Tag Intercepted: 0x${event.rfidUid} ${
          event.isRegistered ? `(Already mapped to ${event.cardHolder?.name})` : '(Ready for assignment)'
        }`,
        type: event.isRegistered ? 'error' : 'success',
      });
    };

    socket.on('card:scanned', handleCardScanned);

    return () => {
      socket.off('card:scanned', handleCardScanned);
    };
  }, [socket]);

  // Clean up enrollment mode on unmount
  useEffect(() => {
    return () => {
      stopHardwareEnrollment();
    };
  }, []);

  const startHardwareEnrollment = async (role: string, name?: string) => {
    try {
      setIsEnrollmentActive(true);
      setEnrollmentTarget({ role, name });
      await fetch(`${API_V1_URL}/hardware/enrollment/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          terminalId,
          targetRole: role,
          targetName: name || undefined,
        }),
      });
    } catch (err) {
      console.warn('Failed to start hardware enrollment mode:', err);
    }
  };

  const stopHardwareEnrollment = async () => {
    try {
      setIsEnrollmentActive(false);
      setEnrollmentTarget(null);
      await fetch(`${API_V1_URL}/hardware/enrollment/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ terminalId }),
      });
    } catch (err) {
      console.warn('Failed to stop hardware enrollment mode:', err);
    }
  };

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

  const handleOpenEdit = (user: UserItem) => {
    setSelectedUser(user);
    setTargetUid(user.rfidUid || '');
    startHardwareEnrollment(user.role, `${user.firstName} ${user.lastName}`);
  };

  const handleCloseEdit = () => {
    setSelectedUser(null);
    stopHardwareEnrollment();
  };

  const handleToggleTerminalScan = () => {
    if (isEnrollmentActive) {
      stopHardwareEnrollment();
    } else {
      startHardwareEnrollment('STUDENT', 'General Registration');
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
        toast.success('Badge Assigned', `RFID 0x${rfidUid.trim()} assigned successfully.`);
        handleCloseEdit();
        await fetchUsers();
      } else {
        sounds.playErrorBuzz();
        setStatusMessage({ text: json.message || 'Failed to assign card', type: 'error' });
        toast.error('Assignment Failed', json.message);
      }
    } catch (err: any) {
      sounds.playErrorBuzz();
      setStatusMessage({ text: err.message || 'Error assigning RFID card', type: 'error' });
      toast.error('Assignment Error', err.message);
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
        toast.success('Badge Revoked', `Removed badge from ${user.firstName} ${user.lastName}.`);
        await fetchUsers();
      } else {
        toast.error('Revoke Failed', json.message);
      }
    } catch (err: any) {
      console.error('Error removing RFID badge:', err);
      toast.error('Revoke Failed', err.message);
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
            Capture live physical card taps from terminal{' '}
            <span className="font-mono text-sky-400 font-semibold">{terminalId}</span> and provision credentials directly into
            PostgreSQL.
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            fetchUsers();
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
      <div
        className={`rounded-2xl p-4 sm:p-5 backdrop-blur-sm border transition-all duration-300 ${
          isEnrollmentActive
            ? 'bg-amber-950/20 border-amber-500/30 shadow-lg shadow-amber-500/5'
            : 'bg-slate-900/60 border-white/[0.06] shadow-xs'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`p-2.5 rounded-xl border shrink-0 ${
                isEnrollmentActive
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
              }`}
            >
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-xs font-mono font-bold uppercase tracking-wider ${
                    isEnrollmentActive ? 'text-amber-400' : 'text-sky-400'
                  }`}
                >
                  {isEnrollmentActive ? 'Hardware Enrollment Session Active' : 'Live Hardware Intercept'}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    isEnrollmentActive
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      : isConnected
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-800 text-slate-400 border-white/[0.06]'
                  }`}
                >
                  {isEnrollmentActive
                    ? `TARGET: ${enrollmentTarget?.role || 'STUDENT'}`
                    : isConnected
                    ? 'LISTENING TO TERMINAL'
                    : 'CONNECTING...'}
                </span>
              </div>

              {isEnrollmentActive ? (
                <div className="mt-1.5 flex items-center gap-2 text-xs text-amber-300/90 font-mono">
                  <SquareTerminal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Terminal OLED: [ ADMIN ENROLL ] ROLE: NEW {enrollmentTarget?.role || 'STUDENT'} &bull; &gt;&gt; TAP NEW BADGE &lt;&lt;
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-400 font-body mt-1">
                  Tap any physical card or fob on your ESP32 terminal to immediately capture its UID here, or edit any user below.
                </p>
              )}

              {liveCapturedTag && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-slate-400">Captured Card:</span>
                  <span className="font-mono text-sm font-extrabold text-white bg-slate-950 px-2.5 py-0.5 rounded-lg border border-white/[0.08] tracking-widest">
                    0x{liveCapturedTag.uid}
                  </span>
                  <CopyButton text={liveCapturedTag.uid} />

                  {liveCapturedTag.isRegistered && liveCapturedTag.holderName ? (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      Mapped to {liveCapturedTag.holderName}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      Unassigned Tag (Ready to Bind)
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Quick Terminal Scan Control & Manual UID Input */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant={isEnrollmentActive ? 'danger' : 'outline'}
              size="sm"
              onClick={handleToggleTerminalScan}
              className="text-xs gap-1.5 font-mono"
            >
              {isEnrollmentActive ? (
                <>
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Stop Hardware Scan</span>
                </>
              ) : (
                <>
                  <SquareTerminal className="w-3.5 h-3.5 text-sky-400" />
                  <span>Activate Terminal Scan</span>
                </>
              )}
            </Button>

            <input
              type="text"
              placeholder="Enter or Tap UID..."
              value={targetUid}
              onChange={(e) => setTargetUid(e.target.value.toUpperCase())}
              className="w-48 px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-white/[0.08] bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
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
                const isCurrentTagHolder = liveCapturedTag?.uid && u.rfidUid === liveCapturedTag.uid;

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
                        {targetUid && targetUid !== u.rfidUid && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleAssignCard(u.id, targetUid)}
                            disabled={isSubmitting}
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
                          onClick={() => handleOpenEdit(u)}
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

      {/* Manual / Edit Modal with Live Hardware Enrollment Beacon & hideFooter */}
      {selectedUser && (
        <Modal
          isOpen={true}
          onClose={handleCloseEdit}
          title={`Provision RFID Badge: ${selectedUser.firstName} ${selectedUser.lastName}`}
          hideFooter
        >
          <div className="space-y-4">
            {/* Live Hardware Enrollment Indicator */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                <SquareTerminal className="w-4 h-4 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300 font-mono">
                    LIVE HARDWARE ENROLLMENT ACTIVE
                  </span>
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="text-[11px] text-amber-200/80 mt-1 leading-relaxed">
                  Terminal <strong className="font-mono text-white">{terminalId}</strong> is scanning for live physical cards.
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-1 bg-slate-950/60 px-2 py-1 rounded border border-white/[0.05]">
                  OLED Display: [ ADMIN ENROLL ] ROLE: NEW {selectedUser.role} &bull; &gt;&gt; TAP NEW BADGE &lt;&lt;
                </div>
              </div>
            </div>

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
                <span className="font-mono text-slate-200">
                  {selectedUser.rfidUid ? `0x${selectedUser.rfidUid}` : 'None'}
                </span>
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
                Tap card on terminal {terminalId} to auto-fill, or enter manually.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCloseEdit}
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
