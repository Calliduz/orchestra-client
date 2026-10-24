import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Lock, Unlock, Eye, EyeOff, LogIn, Cpu, AlertTriangle, Radio, Activity } from 'lucide-react';
import { useSocket } from '../context/SocketContext.js';
import { SessionHeader } from '../components/dashboard/SessionHeader.js';
import { KpiGrid } from '../components/dashboard/KpiGrid.js';
import { ThresholdSliders } from '../components/dashboard/ThresholdSliders.js';
import { RosterTable, StudentRosterRow } from '../components/dashboard/RosterTable.js';
import { OverrideModal } from '../components/dashboard/OverrideModal.js';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';

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
    document.title = 'ORCHESTRA | Faculty Live Telemetry Matrix';
  }, []);

  const fetchActiveSession = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch(`http://localhost:5000/api/v1/sessions/active/${terminalId}`);
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
      if (sessionData?.session) {
        setSessionData((prev: any) => ({
          ...prev,
          session: {
            ...prev.session,
            lateThresholdMins: data.lateThresholdMins,
            cutThresholdMins: data.cutThresholdMins,
          },
        }));
      }
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
  }, [socket, fetchActiveSession, sessionData]);

  const handleUpdateThresholds = async (late: number, cut: number) => {
    if (!sessionData?.session?.id) return;
    const res = await fetch(`http://localhost:5000/api/v1/sessions/${sessionData.session.id}/thresholds`, {
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
    const res = await fetch(`http://localhost:5000/api/v1/sessions/${sessionData.session.id}/override`, {
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
    const res = await fetch(`http://localhost:5000/api/v1/sessions/${sessionId}/close`, {
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
      const res = await fetch('http://localhost:5000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: facultyEmail, password: facultyPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Authentication rejected');
      setAuthToken(data.data.token);
      localStorage.setItem('orchestra-faculty-token', data.data.token);
    } catch (err: any) {
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
        <div className="bg-[#0D1117] border-l-4 border-l-[#F59E0B] border border-[#1E2632] hatch-pattern p-4 font-mono text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3.5">
            <div className="w-8 h-8 rounded-none bg-[#241303] border border-[#522E06] flex items-center justify-center text-[#F59E0B] shrink-0 mt-0.5">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-xs uppercase tracking-wider text-[#F59E0B]">
                  HARDWARE-ENFORCED SESSION TRUST: TERMINAL {terminalId} LOCKED
                </span>
                <span className="text-[9px] bg-[#241303] text-[#F59E0B] border border-[#522E06] px-1.5 py-0.2">
                  INTERLOCK ARMED
                </span>
              </div>
              <p className="text-[#8C98A8] text-[11px] mt-1 leading-relaxed max-w-3xl">
                Terminal ingress is rejected by default. Student RFID taps return <code>403 SESSION_LOCKED</code> until the authorized instructor presents Master Badge <code>0xA1B2C3D4</code> to establish the trust boundary.
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={async () => {
              await fetch('http://localhost:5000/api/v1/hardware/tap', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
                },
                body: JSON.stringify({ terminalId, rfidUid: 'A1B2C3D4' }),
              });
              fetchActiveSession();
            }}
            leftIcon={<Unlock className="w-3.5 h-3.5" />}
          >
            Interrogate Master Badge
          </Button>
        </div>
      )}

      {/* Genuine Telemetry Multi-Register Ribbon */}
      <KpiGrid stats={stats} />

      {/* ASYMMETRIC 70 / 30 CORE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 70% LEFT: Roster Telemetry Ledger */}
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

        {/* 30% RIGHT: Precision Controls & Instructor Auth Console */}
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
            title="Edge Trust Specifications"
            subtitle="Firmware pacing and transponder parameters"
          >
            <div className="space-y-2.5 font-mono text-[11px] text-[#7E8B9B]">
              <div className="flex justify-between border-b border-[#1E2632] pb-1.5">
                <span>PACING_INTERLOCK:</span>
                <span className="text-[#CCFF00] font-bold num-tabular">3000 ms (millis)</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2632] pb-1.5">
                <span>ANTI_PASSBACK_DEFENSE:</span>
                <span className="text-[#CCFF00] font-bold">UNIQUE(session, student)</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2632] pb-1.5">
                <span>FALLBACK_TTL:</span>
                <span className="text-[#38BDF8] font-bold num-tabular">60000 ms (6-Digit OTP)</span>
              </div>
              <div className="flex justify-between border-b border-[#1E2632] pb-1.5">
                <span>SPI_TRANSCEIVER:</span>
                <span className="text-[#E2E8F0]">MFRC522 (13.56 MHz)</span>
              </div>
              <div className="flex justify-between">
                <span>MASTER_BADGE:</span>
                <span className="text-[#F59E0B] font-bold">0xA1B2C3D4</span>
              </div>
            </div>
          </Card>

          {/* Instructor Authority Token Status */}
          <Card
            title="Faculty Clearance Authority"
            subtitle="JWT credential required for manual overrides"
          >
            {authToken ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-[#CCFF00] bg-[#12200A] border border-[#29420D] p-2.5">
                  <Shield className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="font-bold">FACULTY CLEARANCE ACTIVE</div>
                    <div className="text-[10px] text-[#A3E635]/80 mt-0.5">
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
                  Revoke Clearance Token
                </Button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="space-y-3 font-mono text-xs">
                <div>
                  <label className="block text-[10px] text-[#7E8B9B] uppercase mb-1">
                    Institutional Email
                  </label>
                  <input
                    type="email"
                    value={facultyEmail}
                    onChange={(e) => setFacultyEmail(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 text-xs border border-[#1E2632] bg-[#0A0D12] text-[#E2E8F0] focus:outline-none focus:border-[#CCFF00]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-[#7E8B9B] uppercase mb-1">
                    Faculty Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={facultyPassword}
                      onChange={(e) => setFacultyPassword(e.target.value)}
                      required
                      className="w-full px-2.5 py-1.5 text-xs border border-[#1E2632] bg-[#0A0D12] text-[#E2E8F0] focus:outline-none focus:border-[#CCFF00] pr-8"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7E8B9B] hover:text-[#E2E8F0]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {authError && (
                  <div className="p-2 bg-[#220B0B] border border-[#4A1515] text-[#F87171] text-[11px]">
                    {authError}
                  </div>
                )}

                <Button
                  type="submit"
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  isLoading={isLoggingIn}
                  leftIcon={<LogIn className="w-3.5 h-3.5" />}
                >
                  Authenticate Clearance
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
