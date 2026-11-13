import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { SessionHeader, SessionData } from '../components/dashboard/SessionHeader.js';
import { KpiGrid } from '../components/dashboard/KpiGrid.js';
import { ThresholdSliders } from '../components/dashboard/ThresholdSliders.js';
import { RosterTable, StudentRosterRow } from '../components/dashboard/RosterTable.js';
import { OverrideModal } from '../components/dashboard/OverrideModal.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { API_V1_URL } from '../config/api.js';
import { sounds } from '../utils/audio.js';

interface ActiveSessionPayload {
  isLocked: boolean;
  status: string;
  terminalId: string;
  section: {
    id: string;
    sectionCode: string;
    courseName: string;
    roomNumber: string;
    terminalId: string;
  } | null;
  session: SessionData | null;
  roster: StudentRosterRow[];
  stats: {
    totalEnrolled: number;
    present: number;
    late: number;
    cut: number;
    absent: number;
    excused: number;
  };
}

export const FacultyDashboardPage: React.FC = () => {
  const { socket, terminalId } = useSocket();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionData, setSessionData] = useState<ActiveSessionPayload | null>(null);
  const [roster, setRoster] = useState<StudentRosterRow[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEnrolled: 12,
    present: 0,
    late: 0,
    cut: 0,
    excused: 0,
    absent: 12,
  });

  const [selectedStudent, setSelectedStudent] = useState<StudentRosterRow | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [isStartingSession, setIsStartingSession] = useState(false);

  const handleStartSession = async () => {
    const targetSectionId = sessionData?.section?.id;
    if (!targetSectionId) return;
    setActionError(null);
    setIsStartingSession(true);
    try {
      const res = await fetch(`${API_V1_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sectionId: targetSectionId, terminalId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      sounds.playSuccessChime();
      fetchActiveSession();
      toast.success('Session Initialized', `Classroom ingress opened for ${sessionData?.section?.sectionCode || 'section'}.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sounds.playErrorBuzz();
      setActionError(errMsg);
      toast.error('Session Initialization Failed', errMsg);
    } finally {
      setIsStartingSession(false);
    }
  };

  useEffect(() => {
    document.title = 'ORCHESTRA | Live Faculty Attendance Matrix';
  }, []);

  const fetchActiveSession = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`${API_V1_URL}/sessions/active/${terminalId}`);
      const json = await res.json();

      if (json.success && json.data) {
        setSessionData(json.data);
        setRoster(json.data.roster || []);
        if (json.data.stats) {
          setStats(json.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to fetch active session:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [terminalId]);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  useEffect(() => {
    if (!socket) return;

    const handleSessionStarted = () => fetchActiveSession();
    const handleSessionClosed = () => fetchActiveSession();
    const handleAttendanceUpdated = (data: { roster?: StudentRosterRow[]; stats?: typeof stats }) => {
      if (data.roster) setRoster(data.roster);
      if (data.stats) setStats(data.stats);
    };
    const handleThresholdsUpdated = (data: { roster?: StudentRosterRow[]; stats?: typeof stats; lateThresholdMins: number; cutThresholdMins: number }) => {
      if (data.roster) setRoster(data.roster);
      if (data.stats) setStats(data.stats);
      setSessionData((prev) => {
        if (!prev?.session) return prev;
        return {
          ...prev,
          session: {
            ...prev.session,
            lateThresholdMins: data.lateThresholdMins,
            cutThresholdMins: data.cutThresholdMins,
          },
        };
      });
    };

    socket.on('session:started', handleSessionStarted);
    socket.on('session:closed', handleSessionClosed);
    socket.on('attendance:updated', handleAttendanceUpdated);
    socket.on('thresholds:updated', handleThresholdsUpdated);

    return () => {
      socket.off('session:started', handleSessionStarted);
      socket.off('session:closed', handleSessionClosed);
      socket.off('attendance:updated', handleAttendanceUpdated);
      socket.off('thresholds:updated', handleThresholdsUpdated);
    };
  }, [socket, fetchActiveSession]);

  const handleUpdateThresholds = async (late: number, cut: number) => {
    if (!sessionData?.session?.id) return;
    setActionError(null);
    try {
      const res = await fetch(`${API_V1_URL}/sessions/${sessionData.session.id}/thresholds`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lateThresholdMins: late, cutThresholdMins: cut }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      sounds.playSuccessChime();
      fetchActiveSession();
      toast.success('Punctuality Policy Applied', `Updated thresholds: ${late}m grace, ${cut}m cut-off.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sounds.playErrorBuzz();
      setActionError(errMsg);
      toast.error('Policy Update Failed', errMsg);
    }
  };

  const handleApplyOverride = async (studentId: string, status: string, reason: string) => {
    if (!sessionData?.session?.id) return;
    setActionError(null);
    try {
      const res = await fetch(`${API_V1_URL}/sessions/${sessionData.session.id}/override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId, status, reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      sounds.playSuccessChime();
      fetchActiveSession();
      toast.success('Attendance Overridden', `Status manual override applied: ${status}.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sounds.playErrorBuzz();
      setActionError(errMsg);
      toast.error('Override Failed', errMsg);
      throw err;
    }
  };

  const handleCloseSession = async (sessionId: string) => {
    setActionError(null);
    try {
      const res = await fetch(`${API_V1_URL}/sessions/${sessionId}/close`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      sounds.playSuccessChime();
      fetchActiveSession();
      toast.info('Session Terminated', 'Doorway terminal locked. Manifest archived and reports generated.');
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      sounds.playErrorBuzz();
      setActionError(errMsg);
      toast.error('Session Termination Failed', errMsg);
    }
  };

  const isLocked = sessionData?.isLocked ?? true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Session Error Toast if any */}
      {actionError && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-white text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Session Metadata Header */}
      <SessionHeader
        isLocked={isLocked}
        terminalId={terminalId}
        sectionCode={sessionData?.session?.sectionCode || 'AR101-BSIT3A'}
        courseName={sessionData?.session?.courseName || 'Computer Architecture and Organization'}
        roomNumber={sessionData?.session?.roomNumber || 'LAB-304'}
        session={sessionData?.session || null}
        onCloseSession={handleCloseSession}
        onRefresh={fetchActiveSession}
        isRefreshing={isRefreshing}
      />

      {/* When terminal is locked banner */}
      {isLocked && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-300">Classroom Ingress Terminal is Locked</div>
              <div className="text-[11px] text-slate-400">
                Present your physical Faculty Master Badge at terminal {terminalId}, or initialize session directly online.
              </div>
            </div>
          </div>
          {sessionData?.section?.id && (
            <Button
              variant="primary"
              size="sm"
              disabled={isStartingSession}
              onClick={handleStartSession}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs shrink-0 whitespace-nowrap shadow-md shadow-blue-500/20"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{isStartingSession ? 'Initializing...' : 'Unlock & Start Session'}</span>
            </Button>
          )}
        </div>
      )}

      {/* Key Stats Counter KPI Grid */}
      <KpiGrid stats={stats} />

      {/* Live Ingress Manifest Roster Table */}
      <RosterTable
        roster={roster}
        onOpenOverride={(student) => {
          setSelectedStudent(student);
          setIsOverrideModalOpen(true);
        }}
        disabled={isLocked}
        sectionCode={sessionData?.session?.sectionCode || sessionData?.section?.sectionCode}
        courseName={sessionData?.session?.courseName || sessionData?.section?.courseName}
      />

      {/* Dynamic Threshold Sliders & Faculty Authority Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ThresholdSliders
            initialLate={sessionData?.session?.lateThresholdMins ?? 15}
            initialCut={sessionData?.session?.cutThresholdMins ?? 45}
            onApply={handleUpdateThresholds}
            disabled={isLocked}
          />
        </div>

        {/* Faculty Clearance Authority Info Card */}
        <div>
          <Card
            title="Faculty Authority Clearance"
            subtitle="Verified Session Ownership"
            badge={<Shield className="w-4 h-4 text-emerald-500" />}
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-white/[0.05]">
                <div className="w-10 h-10 rounded-full bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                  {user?.firstName?.[0] || 'F'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">
                    {user?.role === 'ADMIN' ? `${user?.firstName} ${user?.lastName}` : `Prof. ${user?.firstName} ${user?.lastName}`}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
                  <div className="inline-block font-mono text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
                    {user?.role === 'ADMIN' ? 'SUPERVISORY ADMIN TOKEN' : 'ACTIVE INSTRUCTOR TOKEN'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-400">
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04] text-[11px]">
                  <span>Session Owner Protection:</span>
                  <span className="text-emerald-400 font-medium">ENFORCED</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-white/[0.04] text-[11px]">
                  <span>Manual Overrides:</span>
                  <span className="text-blue-400 font-medium">AUTHORIZED</span>
                </div>
                <div className="flex items-center justify-between py-1 text-[11px]">
                  <span>Assigned Classroom Node:</span>
                  <span className="font-mono text-slate-300">{terminalId}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Manual Override Dialog */}
      <OverrideModal
        isOpen={isOverrideModalOpen}
        onClose={() => setIsOverrideModalOpen(false)}
        student={selectedStudent}
        onApplyOverride={handleApplyOverride}
      />
    </div>
  );
};

export default FacultyDashboardPage;
