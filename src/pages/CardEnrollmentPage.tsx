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
  Wifi,
  SquareTerminal,
  XCircle,
  ArrowUpDown,
  Users,
  X,
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
  const [badgeFilter, setBadgeFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [sortUnassignedFirst, setSortUnassignedFirst] = useState<boolean>(false);
  const [selectedUserForMap, setSelectedUserForMap] = useState<UserItem | null>(null);

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
  const [userToRemove, setUserToRemove] = useState<UserItem | null>(null);
  const [isRevoking, setIsRevoking] = useState<boolean>(false);
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
        if (selectedUser) {
          handleCloseEdit();
        }
        // If assigned card matches currently intercepted tag, update its registered status
        if (liveCapturedTag && liveCapturedTag.uid.toUpperCase() === rfidUid.trim().toUpperCase()) {
          const mappedTarget = users.find((u) => u.id === userId);
          setLiveCapturedTag({
            ...liveCapturedTag,
            isRegistered: true,
            holderName: mappedTarget ? `${mappedTarget.firstName} ${mappedTarget.lastName}` : 'Assigned User',
          });
        }
        await fetchUsers();
      } else {
        sounds.playErrorBuzz();
        setStatusMessage({ text: json.message || 'Failed to assign card', type: 'error' });
        toast.error('Assignment Failed', json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sounds.playErrorBuzz();
      setStatusMessage({ text: errMsg || 'Error assigning RFID card', type: 'error' });
      toast.error('Assignment Error', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveCard = (user: UserItem) => {
    setUserToRemove(user);
  };

  const confirmRemoveCard = async () => {
    if (!userToRemove) return;
    try {
      setIsRevoking(true);
      const res = await fetch(`${API_V1_URL}/users/${userToRemove.id}/rfid`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (json.success) {
        sounds.playSuccessChime();
        setStatusMessage({ text: json.message, type: 'success' });
        toast.success('Badge Revoked', `Removed badge from ${userToRemove.firstName} ${userToRemove.lastName}.`);
        setUserToRemove(null);
        await fetchUsers();
      } else {
        toast.error('Revoke Failed', json.message);
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Error removing RFID badge:', err);
      toast.error('Revoke Failed', errMsg);
    } finally {
      setIsRevoking(false);
    }
  };

  // Status Filter Counts (scoped to current role selection)
  const roleScopedUsers = users.filter((u) => (roleFilter === 'ALL' ? true : u.role === roleFilter));
  const countAll = roleScopedUsers.length;
  const countAssigned = roleScopedUsers.filter((u) => Boolean(u.rfidUid)).length;
  const countUnassigned = roleScopedUsers.filter((u) => !u.rfidUid).length;

  const badgeFilterOptions = [
    {
      id: 'ALL' as const,
      label: 'All Users',
      count: countAll,
      icon: <Users className="w-3.5 h-3.5" />,
      activeClass: 'bg-sky-500/20 text-sky-200 border-sky-500/40 shadow-xs shadow-sky-500/10',
      countClass: 'bg-sky-500/30 text-sky-100 border-sky-400/40',
    },
    {
      id: 'ASSIGNED' as const,
      label: 'Assigned Badges',
      count: countAssigned,
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
      activeClass: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-xs shadow-emerald-500/10',
      countClass: 'bg-emerald-500/30 text-emerald-100 border-emerald-400/40',
    },
    {
      id: 'UNASSIGNED' as const,
      label: 'Unassigned Badges',
      count: countUnassigned,
      icon: <AlertCircle className="w-3.5 h-3.5 text-amber-400" />,
      activeClass: 'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-xs shadow-amber-500/10',
      countClass: 'bg-amber-500/30 text-amber-100 border-amber-400/40',
    },
  ];

  // Filtered & Sorted Users
  const filteredUsers = users
    .filter((u) => {
      // 1. Role filter
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;

      // 2. Badge Assignment Status Filter
      if (badgeFilter === 'ASSIGNED' && !u.rfidUid) return false;
      if (badgeFilter === 'UNASSIGNED' && Boolean(u.rfidUid)) return false;

      // 3. Search query
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.studentId.toLowerCase().includes(q) ||
        (u.rfidUid && u.rfidUid.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      if (sortUnassignedFirst) {
        const aUnassigned = !a.rfidUid;
        const bUnassigned = !b.rfidUid;
        if (aUnassigned && !bUnassigned) return -1;
        if (!aUnassigned && bUnassigned) return 1;
      }
      return 0;
    });

  // Active UID for preview: live hardware intercept or manual target input
  const activePreviewUid = liveCapturedTag?.uid || targetUid;

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Left Column: Intercept Telemetry & Controls */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
            <div>
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
                      Tap any physical RFID card or fob on your ESP32 terminal to immediately capture its UID into the virtual preview card.
                    </p>
                  )}
                </div>
              </div>

              {/* Status Message feedback banner */}
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

            {/* Quick Terminal Scan Control & Manual UID Input */}
            <div className="pt-2 border-t border-white/[0.05] flex flex-wrap items-center gap-2.5">
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

              <div className="relative flex-1 min-w-[180px]">
                <input
                  type="text"
                  placeholder="Enter or Tap UID (Hex)..."
                  value={targetUid}
                  onChange={(e) => setTargetUid(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold uppercase rounded-xl border border-white/[0.08] bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                />
                {targetUid && (
                  <button
                    type="button"
                    onClick={() => setTargetUid('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title="Clear UID"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Realistic High-Tech Virtual Badge Preview Card */}
          <div className="lg:col-span-6">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-sky-950/90 border border-sky-500/30 p-4 sm:p-5 shadow-2xl shadow-sky-950/40 backdrop-blur-md">
              {/* Circuit grid watermark */}
              <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

              {/* Glowing holographic ambient sheen */}
              <div className="absolute -top-14 -right-14 w-32 h-32 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-14 -left-14 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header: Institution & NFC Contactless Graphic */}
              <div className="relative z-10 flex items-start justify-between gap-3 pb-3 border-b border-white/[0.08]">
                <div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-sky-400" />
                    <span className="text-[11px] font-black tracking-wider text-white uppercase">
                      Orchestra Physical Access
                    </span>
                  </div>
                  <div className="text-[9px] font-mono tracking-widest text-sky-400/80 uppercase mt-0.5">
                    MIFARE Classic 1K &bull; ISO 14443-A &bull; 13.56 MHz
                  </div>
                </div>

                {/* Contactless Waves Graphic */}
                <div className="flex items-center gap-1 text-sky-400/90" title="Contactless NFC Interface">
                  <svg
                    className="w-4 h-4 text-sky-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 8.5a10 10 0 0 1 14 0" />
                    <path d="M7.5 12a6 6 0 0 1 9 0" />
                    <path d="M10 15.5a2 2 0 0 1 4 0" />
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-sky-300">NFC</span>
                </div>
              </div>

              {/* NFC Chip & Live Intercept Status Row */}
              <div className="relative z-10 flex items-center justify-between gap-3 mt-3.5">
                {/* Metallic Gold NFC Chip Graphic */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-12 h-9 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-yellow-600 border border-yellow-300/80 shadow-md relative overflow-hidden flex items-center justify-center p-0.5"
                    title="NFC Contact & Contactless Smart Chip"
                  >
                    <div className="w-full h-full border border-amber-800/40 rounded-xs grid grid-cols-3 grid-rows-2 gap-0.5 pointer-events-none">
                      <div className="border-r border-b border-amber-800/30" />
                      <div className="border-r border-b border-amber-800/30" />
                      <div className="border-b border-amber-800/30" />
                      <div className="border-r border-amber-800/30" />
                      <div className="border-r border-amber-800/30" />
                      <div />
                    </div>
                    {/* Microchip center core pad */}
                    <div className="absolute w-2.5 h-2 rounded-xs bg-amber-300/80 border border-amber-700/50 shadow-inner" />
                  </div>

                  <div className="flex flex-col">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Interface</span>
                    <span className="text-[11px] font-bold text-sky-300 flex items-center gap-1 font-mono">
                      <Wifi className="w-3 h-3 text-sky-400 rotate-90" />
                      <span>Contactless Tap</span>
                    </span>
                  </div>
                </div>

                {/* Tag Mapping / Intercept Status */}
                <div>
                  {activePreviewUid ? (
                    liveCapturedTag?.isRegistered && liveCapturedTag.holderName ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        <UserCheck className="w-3 h-3" />
                        <span>Mapped: {liveCapturedTag.holderName}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs shadow-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Ready for Assignment</span>
                      </span>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-mono text-slate-400 bg-slate-950/60 border border-white/[0.06]">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping mr-1" />
                      <span>Awaiting Tap...</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Hexadecimal Badge UID Display */}
              <div className="relative z-10 mt-3.5">
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1">
                  <span>Hexadecimal Badge UID</span>
                  {activePreviewUid && (
                    <span className="text-emerald-400 text-[10px] font-bold font-mono">
                      LIVE INTERCEPT READY
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 font-mono text-base font-black text-white tracking-widest bg-slate-950/90 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-sky-400 text-xs font-bold">0x</span>
                      <span>{activePreviewUid ? activePreviewUid : '••••••••'}</span>
                    </div>
                    {activePreviewUid && (
                      <span className="text-[10px] font-normal tracking-normal text-slate-500 uppercase">
                        {activePreviewUid.length * 4}-Bit
                      </span>
                    )}
                  </div>
                  {activePreviewUid && <CopyButton text={activePreviewUid} />}
                </div>
              </div>

              {/* Quick "Map to Selected User" Action Bar */}
              <div className="relative z-10 mt-3.5 pt-3 border-t border-white/[0.08] space-y-2">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedUserForMap?.id || ''}
                      onChange={(e) => {
                        const found = users.find((u) => u.id === e.target.value) || null;
                        setSelectedUserForMap(found);
                      }}
                      className="w-full px-2.5 py-1.5 text-xs font-medium rounded-xl border border-white/10 bg-slate-950 text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500/40"
                    >
                      <option value="">
                        {selectedUserForMap
                          ? `${selectedUserForMap.lastName}, ${selectedUserForMap.firstName} (${selectedUserForMap.studentId || selectedUserForMap.role})`
                          : '— Choose User to Map —'}
                      </option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {!u.rfidUid ? '⚡ [Unassigned] ' : '✓ '}
                          {u.lastName}, {u.firstName} ({u.studentId || u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!activePreviewUid || !selectedUserForMap || isSubmitting}
                    onClick={() => {
                      if (selectedUserForMap && activePreviewUid) {
                        handleAssignCard(selectedUserForMap.id, activePreviewUid);
                      }
                    }}
                    className="text-xs font-bold whitespace-nowrap flex items-center justify-center gap-1.5 py-1.5 px-3 shadow-md shadow-sky-500/20"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Map to Selected User</span>
                  </Button>
                </div>

                {selectedUserForMap ? (
                  <div className="text-[11px] text-sky-300 font-medium flex items-center justify-between">
                    <span className="truncate">
                      Target: <strong className="text-white">{selectedUserForMap.firstName} {selectedUserForMap.lastName}</strong>{' '}
                      ({selectedUserForMap.studentId || selectedUserForMap.role})
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedUserForMap(null)}
                      className="text-slate-400 hover:text-slate-200 text-[10px] ml-2 shrink-0 underline"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400">
                    💡 Tip: Click any row below to target that user for instant 1-click binding.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Directory & Management Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
        {/* Table Header Strip */}
        <div className="p-4 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Institutional Directory &amp; Badge Assignment Table</h2>
            <p className="text-[11px] text-slate-400 mt-0.5">Provision physical RFID badges to registered students and faculty.</p>
          </div>
          <span className="text-xs text-slate-400 font-mono self-start sm:self-center">
            {filteredUsers.length} of {users.length} Users
          </span>
        </div>

        {/* Badge Assignment Status Filter Chips & Unassigned Sorting Ribbon */}
        <div className="p-3.5 border-b border-white/[0.05] bg-white/[0.015] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Filter Chips: [All Users (N)], [Assigned Badges (N)], [Unassigned Badges (N)] */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono font-semibold text-slate-400 mr-1 hidden sm:inline">Badge Status:</span>
            {badgeFilterOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setBadgeFilter(opt.id);
                  sounds.playKeyChirp();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  badgeFilter === opt.id
                    ? opt.activeClass
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-white/[0.06] hover:bg-white/[0.03]'
                }`}
              >
                {opt.icon}
                <span>{opt.label}</span>
                <span
                  className={`ml-0.5 px-1.5 py-0.2 rounded-md text-[10px] font-mono font-bold border ${
                    badgeFilter === opt.id
                      ? opt.countClass
                      : 'bg-slate-950 text-slate-400 border-white/[0.06]'
                  }`}
                >
                  ({opt.count})
                </span>
              </button>
            ))}
          </div>

          {/* Unassigned Sorting Toggle */}
          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => {
                setSortUnassignedFirst((prev) => !prev);
                sounds.playKeyChirp();
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                sortUnassignedFirst
                  ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 shadow-xs shadow-amber-500/10'
                  : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border-white/[0.06] hover:bg-white/[0.03]'
              }`}
              title="Sort accounts without physical badges to the top"
            >
              <ArrowUpDown className={`w-3.5 h-3.5 ${sortUnassignedFirst ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>Unassigned First</span>
              {sortUnassignedFirst && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse ml-0.5" />
              )}
            </button>
          </div>
        </div>

        {/* Search & Role Filter Bar */}
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
                const isSelectedForMap = selectedUserForMap?.id === u.id;

                return (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUserForMap(u)}
                    className={`transition-colors cursor-pointer hover:bg-white/[0.03] ${
                      isSelectedForMap
                        ? 'bg-sky-500/[0.09] ring-1 ring-inset ring-sky-500/40'
                        : isCurrentTagHolder
                        ? 'bg-sky-500/[0.05]'
                        : ''
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
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{u.lastName}, {u.firstName}</span>
                        {isSelectedForMap && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                            TARGET
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-300 align-middle">
                      {u.studentId || <span className="text-slate-600">—</span>}
                    </td>

                    <td className="py-3 px-4 align-middle">
                      {u.rfidUid ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <span className="font-mono font-bold text-xs bg-slate-950 px-2 py-0.5 rounded-lg border border-white/[0.08] tracking-wider text-white">
                            0x{u.rfidUid}
                          </span>
                          <CopyButton text={u.rfidUid} />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>Unassigned</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right align-middle" onClick={(e) => e.stopPropagation()}>
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
                  <td colSpan={5} className="py-10 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CreditCard className="w-8 h-8 text-slate-600" />
                      <span className="text-sm font-semibold text-slate-400">No users match active filters</span>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Try resetting your badge status filter, role filter, or search keywords.
                      </p>
                      {(badgeFilter !== 'ALL' || roleFilter !== 'ALL' || searchQuery) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setBadgeFilter('ALL');
                            setRoleFilter('ALL');
                            setSearchQuery('');
                          }}
                          className="mt-2 text-xs"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
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

      {/* Confirmation Modal to revoke badge */}
      <Modal
        isOpen={Boolean(userToRemove)}
        onClose={() => setUserToRemove(null)}
        title="Revoke Badge UID"
        description={userToRemove ? `Are you sure you want to remove the badge UID from ${userToRemove.firstName} ${userToRemove.lastName}?` : undefined}
        confirmLabel="REVOKE"
        confirmVariant="danger"
        onConfirm={confirmRemoveCard}
        isLoading={isRevoking}
      >
        <p className="text-xs text-slate-300">
          This will unlink RFID card <span className="font-mono font-bold text-white">{userToRemove?.rfidUid}</span>. The user will be unable to tap into classrooms until a new badge is enrolled.
        </p>
      </Modal>
    </div>
  );
};

export default CardEnrollmentPage;
