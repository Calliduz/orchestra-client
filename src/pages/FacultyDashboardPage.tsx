import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Unlock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import { SessionHeader } from '../components/dashboard/SessionHeader.js';
import { KpiGrid } from '../components/dashboard/KpiGrid.js';
import { ThresholdSliders } from '../components/dashboard/ThresholdSliders.js';
import { RosterTable, StudentRosterRow } from '../components/dashboard/RosterTable.js';
import { OverrideModal } from '../components/dashboard/OverrideModal.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { API_V1_URL } from '../config/api.js';
import { sounds } from '../utils/audio.js';

export const FacultyDashboardPage: React.FC = () => {
  const { socket, terminalId } = useSocket();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [roster, setRoster] = useState<StudentRosterRow[]>([]);
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

  // Faculty authentication state
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('orchestra-faculty-token'));
  const [facultyEmail, setFacultyEmail] = useState('faculty@orchestra.edu');
  const [facultyPassword, setFacultyPassword] = useState('Password123!');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    document.title = 'ORCHESTRA | Faculty Attendance Matrix';
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
    const handleAttendanceUpdated = (data: any) => {
      if (data.roster) setRoster(data.roster);
      if (data.stats) setStats(data.stats);
    };
    const handleThresholdsUpdated = (data: any) => {
      if (data.roster) setRoster(data.roster);
      if (data.stats) setStats(data.stats);
      setSessionData((prev: any) => {
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
    const res = await fetch(`${API_V1_URL}/sessions/${sessionData.session.id}/thresholds`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lateThresholdMins: late, cutThresholdMins: cut }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    fetchActiveSession();
  };

  const handleApplyOverride = async (studentId: string, status: string, reason: string) => {
    if (!sessionData?.session?.id) return;
    const res = await fetch(`${API_V1_URL}/sessions/${sessionData.session.id}/override`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken ? `Bearer ${authToken}` : '',
      },
      body: JSON.stringify({ studentId, status, reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    fetchActiveSession();
  };

  const handleCloseSession = async (sessionId: string) => {
    const res = await fetch(`${API_V1_URL}/sessions/${sessionId}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message);
    fetchActiveSession();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoggingIn(true);
      setAuthError(null);
      sounds.playKeyChirp();
      const res = await fetch(`${API_V1_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: facultyEmail, password: facultyPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication rejected');
      setAuthToken(data.data.token);
      localStorage.setItem('orchestra-faculty-token', data.data.token);
      sounds.playSuccessChime();
    } catch (err: any) {
      sounds.playErrorBuzz();
      setAuthError(err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const isLocked = sessionData?.isLocked ?? true;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
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

      {/* Hardware-Enforced Trust Interlock Card */}
      {isLocked && (
        <div className="bg-amber-50/90 border border-amber-200 text-amber-900 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-200 p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300/60 dark:bg-amber-500/20 dark:border-amber-500/30 flex items-center justify-center text-amber-800 dark:text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-sm text-amber-950 dark:text-amber-300">
                  Hardware Trust Boundary Active: Terminal {terminalId} Locked
                </span>
                <span className="text-xs bg-amber-200/80 text-amber-900 border border-amber-300/80 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  STANDBY
                </span>
              </div>
              <p className="text-amber-900/90 dark:text-slate-300 text-xs mt-1 leading-relaxed max-w-2xl font-body">
                Terminal ingress is rejected by default. Student RFID taps return <code className="bg-amber-200/50 dark:bg-amber-950/40 px-1 py-0.5 rounded text-amber-950 dark:text-amber-200 font-mono">403 SESSION_LOCKED</code> until the authorized instructor presents Master Badge <code className="bg-amber-200/50 dark:bg-amber-950/40 px-1 py-0.5 rounded text-amber-950 dark:text-amber-200 font-mono">0xA1B2C3D4</code> to establish the trust boundary.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            variant="primary"
            className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white border-0 shadow-sm shrink-0 font-bold active:scale-95 transition-all"
            onClick={async () => {
              sounds.playKeyChirp();
              await fetch(`${API_V1_URL}/hardware/tap`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
                },
                body: JSON.stringify({ terminalId, rfidUid: 'A1B2C3D4' }),
              });
              sounds.playSuccessChime();
              fetchActiveSession();
            }}
            leftIcon={<Unlock className="w-4 h-4 text-amber-300" />}
          >
            Interrogate Master Badge
          </Button>
        </div>
      )}

      {/* Real-time Headcount Telemetry Multi-Register Ribbon */}
      <KpiGrid stats={stats} />

      {/* Main Core 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Attendance Roster Ledger */}
        <div className="lg:col-span-8 space-y-6">
          <RosterTable
            roster={roster}
            onOpenOverride={(student) => {
              setSelectedStudent(student);
              setIsOverrideModalOpen(true);
            }}
            disabled={isLocked}
          />
        </div>

        {/* Right: Operational Settings & Faculty Clearance */}
        <div className="lg:col-span-4 space-y-6">
          {/* Punctuality Sliders */}
          <ThresholdSliders
            sessionId={sessionData?.session?.id}
            initialLate={sessionData?.session?.lateThresholdMins || 15}
            initialCut={sessionData?.session?.cutThresholdMins || 45}
            onApply={handleUpdateThresholds}
            disabled={isLocked}
          />

          {/* Hardware Security Interlock Diagnostics */}
          <Card
            title="Edge Hardware Parameters"
            subtitle="ESP32 firmware pacing and ISO14443A configuration"
          >
            <div className="space-y-3 font-mono text-xs text-hud-secondary">
              <div className="flex justify-between items-center border-b border-hud-subtle pb-2">
                <span className="text-hud-muted">PACING INTERLOCK:</span>
                <span className="text-emerald-400 font-semibold num-tabular">3000 ms (millis)</span>
              </div>
              <div className="flex justify-between items-center border-b border-hud-subtle pb-2">
                <span className="text-hud-muted">ANTI-PASSBACK:</span>
                <span className="text-emerald-400 font-semibold">UNIQUE(session, student)</span>
              </div>
              <div className="flex justify-between items-center border-b border-hud-subtle pb-2">
                <span className="text-hud-muted">KEYPAD OTP TTL:</span>
                <span className="text-hud-text font-semibold num-tabular">60s (Decaying PIN)</span>
              </div>
              <div className="flex justify-between items-center border-b border-hud-subtle pb-2">
                <span className="text-hud-muted">SPI TRANSCEIVER:</span>
                <span className="text-hud-text">MFRC522 (13.56 MHz)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-hud-muted">MASTER BADGE UID:</span>
                <span className="text-amber-400 font-semibold">0xA1B2C3D4</span>
              </div>
            </div>
          </Card>

          {/* Instructor Authority Token Status */}
          <Card
            title="Faculty Clearance Authority"
            subtitle="JWT credential required for manual overrides"
          >
            {authToken ? (
              <div className="space-y-3 font-sans text-xs">
                <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                  <Shield className="w-5 h-5 shrink-0" />
                  <div>
                    <div className="font-semibold text-sm">Faculty Session Authenticated</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Bearer authentication active for manual overrides
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setAuthToken(null);
                    localStorage.removeItem('orchestra-faculty-token');
                  }}
                >
                  Sign Out of Console
                </Button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-body">
                    <label className="font-semibold text-hud-secondary">
                      Institutional Email
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setFacultyEmail('faculty@orchestra.edu');
                        setFacultyPassword('Password123!');
                        sounds.playKeyChirp();
                      }}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-semibold"
                    >
                      ⚡ Demo Fill
                    </button>
                  </div>
                  <input
                    type="email"
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-xl transition-colors font-body shadow-tactile"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-hud-secondary mb-1.5 font-body">
                    Faculty Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={facultyPassword}
                      onChange={(e) => setFacultyPassword(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-xl pr-10 transition-colors font-body shadow-tactile"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-hud-secondary hover:text-hud-text"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs rounded-xl shadow-xs">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  variant="primary"
                  className="w-full shadow-md"
                  isLoading={isLoggingIn}
                  leftIcon={<LogIn className="w-4 h-4" />}
                >
                  Authenticate Faculty Clearance
                </Button>
              </form>
            )}
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
