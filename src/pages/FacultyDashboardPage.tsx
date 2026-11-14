import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Lock,
  Unlock,
  AlertTriangle,
  FileCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Download,
  Clock,
  Paperclip,
} from 'lucide-react';
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
import { Modal } from '../components/ui/Modal.js';
import { API_V1_URL } from '../config/api.js';
import { sounds } from '../utils/audio.js';

interface PendingExcuseItem {
  id: string;
  studentId: string;
  reason: string;
  documentUrl?: string | null;
  documentName?: string | null;
  status: string;
  createdAt: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    studentId: string | null;
    email: string;
  };
  attendanceLog: {
    id: string;
    status: string;
    tapTimestamp: string | null;
    egressTimestamp?: string | null;
    totalMinutesAttended?: number | null;
    createdAt: string;
    session: {
      id: string;
      section: {
        id: string;
        sectionCode: string;
        courseName: string;
        roomNumber: string;
      };
    };
  };
}

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

  // Excuse Requests Review Drawer State
  const [pendingExcuses, setPendingExcuses] = useState<PendingExcuseItem[]>([]);
  const [isExcuseDrawerOpen, setIsExcuseDrawerOpen] = useState(false);
  const [reviewingExcuseId, setReviewingExcuseId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});

  const fetchPendingExcuses = useCallback(async () => {
    try {
      const res = await fetch(`${API_V1_URL}/excuses/pending`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setPendingExcuses(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch pending excuses:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchPendingExcuses();
  }, [fetchPendingExcuses]);

  const handleReviewExcuse = async (excuseId: string, status: 'APPROVED' | 'REJECTED') => {
    setReviewingExcuseId(excuseId);
    try {
      const notes = reviewNotes[excuseId] || '';
      const res = await fetch(`${API_V1_URL}/excuses/${excuseId}/review`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status, reviewNotes: notes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to review excuse request');
      }

      sounds.playSuccessChime();
      toast.success(
        `Excuse Request ${status === 'APPROVED' ? 'Approved' : 'Rejected'}`,
        status === 'APPROVED'
          ? 'Student attendance record updated to EXCUSED.'
          : 'Excuse request was rejected.'
      );
      fetchPendingExcuses();
      fetchActiveSession();
    } catch (err: any) {
      sounds.playErrorBuzz();
      toast.error('Review Action Failed', err.message);
    } finally {
      setReviewingExcuseId(null);
    }
  };

  const handleDownloadExcuseDocument = async (excuseId: string, fileName?: string | null) => {
    try {
      const res = await fetch(`${API_V1_URL}/excuses/${excuseId}/document`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Failed to download document');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'excuse_attachment';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Download Failed', err.message);
    }
  };

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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      const res = await fetch(`${API_V1_URL}/sessions/active/${terminalId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
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
  }, [terminalId, token]);

  useEffect(() => {
    fetchActiveSession();
  }, [fetchActiveSession]);

  useEffect(() => {
    if (!socket) return;

    const handleSessionStarted = () => {
      fetchActiveSession();
      fetchPendingExcuses();
    };
    const handleSessionClosed = () => {
      fetchActiveSession();
      fetchPendingExcuses();
    };
    const handleExcuseReviewed = () => {
      fetchPendingExcuses();
      fetchActiveSession();
    };
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
    socket.on('excuse:reviewed', handleExcuseReviewed);

    return () => {
      socket.off('session:started', handleSessionStarted);
      socket.off('session:closed', handleSessionClosed);
      socket.off('attendance:updated', handleAttendanceUpdated);
      socket.off('thresholds:updated', handleThresholdsUpdated);
      socket.off('excuse:reviewed', handleExcuseReviewed);
    };
  }, [socket, fetchActiveSession, fetchPendingExcuses]);

  const handleUpdateThresholds = async (late: number, cut: number) => {
    if (!sessionData?.session?.id) return;
    setActionError(null);
    try {
      const res = await fetch(`${API_V1_URL}/sessions/${sessionData.session.id}/thresholds`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

      {/* Pending Excuse Requests Alert Banner */}
      {pendingExcuses.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-purple-950/70 via-slate-900 to-indigo-950/70 border border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>Pending Absence Excuse Slips</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500 text-white animate-pulse">
                  {pendingExcuses.length} Pending
                </span>
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Students have submitted medical or absence justifications for your review.
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsExcuseDrawerOpen(true)}
            leftIcon={<FileCheck className="w-3.5 h-3.5 text-purple-300" />}
            className="border-purple-400/30 hover:border-purple-400/60 bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 text-xs shrink-0 whitespace-nowrap"
          >
            Review Excuses ({pendingExcuses.length})
          </Button>
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

      {/* Pending Excuse Requests Review Modal */}
      {isExcuseDrawerOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsExcuseDrawerOpen(false)}
          title={`Absence Excuse Requests (${pendingExcuses.length} Pending)`}
          hideFooter
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {pendingExcuses.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs space-y-1">
                <FileCheck className="w-8 h-8 text-slate-600 mx-auto" />
                <div className="font-semibold text-slate-300">All Excuses Reviewed</div>
                <p className="text-slate-500">There are no pending absence justifications for your sections.</p>
              </div>
            ) : (
              pendingExcuses.map((excuse) => (
                <div
                  key={excuse.id}
                  className="p-4 rounded-xl bg-slate-950/80 border border-white/[0.08] space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-2.5">
                    <div>
                      <div className="text-sm font-bold text-white">
                        {excuse.student.lastName}, {excuse.student.firstName}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        ID: {excuse.student.studentId || 'N/A'} • {excuse.student.email}
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className="text-xs font-mono font-bold text-purple-300">
                        {excuse.attendanceLog.session.section.sectionCode}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Session: {new Date(excuse.attendanceLog.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Student Justification:
                    </div>
                    <p className="text-xs text-slate-200 bg-slate-900/60 p-2.5 rounded-lg border border-white/[0.04] leading-relaxed">
                      {excuse.reason}
                    </p>
                  </div>

                  {excuse.documentUrl && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-purple-950/20 border border-purple-500/20 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <Paperclip className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="text-purple-300 truncate font-mono text-[11px]">
                          {excuse.documentName || 'Proof Document'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDownloadExcuseDocument(excuse.id, excuse.documentName)}
                        className="px-2 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 font-mono text-[10px] flex items-center gap-1 shrink-0 transition"
                      >
                        <Download className="w-3 h-3" />
                        View Document
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Review Note / Feedback (Optional):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Validated clinic slip with University Health Service"
                      value={reviewNotes[excuse.id] || ''}
                      onChange={(e) =>
                        setReviewNotes((prev) => ({ ...prev, [excuse.id]: e.target.value }))
                      }
                      className="w-full bg-slate-900 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={reviewingExcuseId === excuse.id}
                      onClick={() => handleReviewExcuse(excuse.id, 'REJECTED')}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                      className="text-xs h-7 py-0"
                    >
                      {reviewingExcuseId === excuse.id ? 'Processing...' : 'Reject'}
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={reviewingExcuseId === excuse.id}
                      onClick={() => handleReviewExcuse(excuse.id, 'APPROVED')}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                      className="text-xs h-7 py-0 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/30"
                    >
                      {reviewingExcuseId === excuse.id ? 'Processing...' : 'Approve & Mark Excused'}
                    </Button>
                  </div>
                </div>
              ))
            )}

            <div className="flex items-center justify-end pt-3 border-t border-white/[0.06]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExcuseDrawerOpen(false)}
                className="text-xs h-8"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default FacultyDashboardPage;
