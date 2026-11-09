import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Radio,
  Users,
  Clock,
  ArrowRight,
  Play,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Cpu,
  MapPin,
  FileSpreadsheet,
  Activity,
  Layers,
  ChevronRight,
  Wifi,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';

interface SectionTaught {
  id: string;
  sectionCode: string;
  courseName: string;
  roomNumber: string;
  terminalId: string;
  defaultLateThresholdMins: number;
  defaultCutThresholdMins: number;
  _count: {
    enrollments: number;
    sessions: number;
  };
  sessions?: {
    id: string;
    terminalId: string;
    startTime: string;
  }[];
}

export const FacultyClassroomsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { isConnected, terminalId, socket } = useSocket();
  const navigate = useNavigate();

  const [sections, setSections] = useState<SectionTaught[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startingSectionId, setStartingSectionId] = useState<string | null>(null);

  const handleStartSession = async (sectionId: string) => {
    try {
      setStartingSectionId(sectionId);
      const res = await fetch(`${API_V1_URL}/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sectionId }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to start session');
      }
      navigate('/faculty/live');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setStartingSectionId(null);
    }
  };

  useEffect(() => {
    fetchMySections();
    if (!socket) return;
    socket.on('session:started', fetchMySections);
    socket.on('session:closed', fetchMySections);
    return () => {
      socket.off('session:started', fetchMySections);
      socket.off('session:closed', fetchMySections);
    };
  }, [socket]);

  const fetchMySections = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_V1_URL}/sections/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSections(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch faculty sections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const totalEnrolled = sections.reduce((acc, s) => acc + (s._count?.enrollments || 0), 0);
  const totalSessions = sections.reduce((acc, s) => acc + (s._count?.sessions || 0), 0);
  const hasAnyActiveSession = sections.some((s) => s.sessions && s.sessions.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-950/80 via-slate-900 to-indigo-950/60 border border-white/[0.08] p-6 md:p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>INSTRUCTOR CONSOLE &bull; ORCHESTRA v1.0.4</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.role === 'ADMIN' ? 'System Administrator' : `Prof. ${user?.lastName}`}
          </h1>
          <p className="text-slate-300 text-xs md:text-sm mt-2 leading-relaxed">
            Monitor real-time doorway ingress, adjust dynamic punctuality grace windows, and inspect comprehensive
            attendance audit reports for your registered course sections.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/faculty/live')}
              className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Live Session Console</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/faculty/reports')}
              className="gap-2 border-white/[0.1] hover:bg-white/[0.05]"
            >
              <span>View Past Attendance Reports &rarr;</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Hero Metric Stats Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Assigned Courses</span>
            <BookOpen className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-white mt-1.5 font-mono">
            {sections.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Active registered sections</div>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Enrolled Students</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1.5 font-mono">
            {totalEnrolled}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Total active roster size</div>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Conducted Sessions</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl md:text-3xl font-extrabold text-purple-400 mt-1.5 font-mono">
            {totalSessions}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Historical archived classes</div>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Terminal Node</span>
            <Wifi className={`w-4 h-4 ${isConnected ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <div className="text-lg md:text-xl font-bold text-sky-400 mt-1.5 font-mono truncate">
            {terminalId || 'TERM-CL304'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-medium mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online &bull; Room LAB-304</span>
          </div>
        </div>
      </div>

      {/* Main Content Area: 2 Columns for optimal screen balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (Col 1-2): Classroom Section Cards */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span>My Assigned Classroom Sections</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Only students enrolled in these sections are permitted to tap into your sessions.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMySections}
              disabled={isLoading}
              className="gap-2 border-white/[0.08] hover:bg-white/[0.04]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {sections.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-white/[0.06] text-slate-400">
              <p className="font-medium text-slate-300">No classroom sections assigned to your faculty profile yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Please contact your administrator to assign course sections.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map((sec) => {
                const hasActive = sec.sessions && sec.sessions.length > 0;
                return (
                  <div
                    key={sec.id}
                    className={`rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 border backdrop-blur-md relative overflow-hidden ${
                      hasActive
                        ? 'border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-slate-900/90 to-slate-900 shadow-xl shadow-emerald-500/5'
                        : 'border-white/[0.07] bg-slate-900/60 hover:border-white/[0.15] hover:bg-slate-900/80'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {sec.sectionCode}
                        </span>
                        {hasActive ? (
                          <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            LIVE SESSION
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/[0.05]">
                            STANDBY
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-white leading-snug">{sec.courseName}</h3>

                      {/* Metadata Grid */}
                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.04]">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Classroom</span>
                          <span className="font-mono text-white font-semibold text-xs mt-0.5 block">
                            {sec.roomNumber}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.04]">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Terminal Node</span>
                          <span className="font-mono text-sky-400 font-semibold text-xs mt-0.5 block truncate">
                            {sec.terminalId}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.04]">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Enrolled</span>
                          <span className="font-mono text-emerald-400 font-bold text-xs mt-0.5 block">
                            {sec._count.enrollments} Students
                          </span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-950/40 border border-white/[0.04]">
                          <span className="text-[10px] font-mono text-slate-500 uppercase block">Grace Policy</span>
                          <span className="font-mono text-amber-400 font-medium text-xs mt-0.5 block">
                            {sec.defaultLateThresholdMins}m / {sec.defaultCutThresholdMins}m
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Action Bar */}
                    <div className="mt-5 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-3">
                      <button
                        onClick={() => navigate(`/faculty/reports?sectionId=${sec.id}`)}
                        className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 group font-medium"
                      >
                        <span>History ({sec._count.sessions})</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition" />
                      </button>

                      {hasActive ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => navigate('/faculty/live')}
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 shadow-sm shadow-emerald-500/20"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>Enter Live</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={startingSectionId === sec.id}
                          onClick={() => handleStartSession(sec.id)}
                          className="gap-1.5 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-sm shadow-blue-500/20"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>{startingSectionId === sec.id ? 'Starting...' : 'Start Session'}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right (Col 3): Companion Hardware Telemetry & Institutional Protocol Card */}
        <div className="space-y-4">
          {/* Card A: Terminal Hardware Telemetry */}
          <div className="rounded-2xl p-5 bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Terminal Ingress Node</h3>
              </div>
              <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                SYNCHRONIZED
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-slate-400">Classroom Location:</span>
                <span className="font-mono text-white font-semibold">LAB-304</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-slate-400">Device Hardware ID:</span>
                <span className="font-mono text-sky-400 font-semibold">{terminalId || 'TERM-CL304'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-slate-400">RFID Transceiver:</span>
                <span className="font-mono text-slate-300">RC522 &bull; 13.56 MHz</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
                <span className="text-slate-400">Doorway Boundary:</span>
                <span className="text-emerald-400 font-medium">Hardware Interlocked</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Faculty Master Key:</span>
                <span className="text-blue-400 font-medium">Provisioned</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/faculty/live')}
              className="w-full gap-2 border-white/[0.08] hover:bg-white/[0.05] text-xs"
            >
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>Inspect Live Telemetry Stream &rarr;</span>
            </Button>
          </div>

          {/* Card B: Fast Operational Guide */}
          <div className="rounded-2xl p-5 bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Attendance Protocol</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <span className="font-semibold text-white">Unlock Session:</span> Tap your physical Faculty Master
                  Badge at the doorway terminal or click &quot;Start Session&quot;.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <span className="font-semibold text-white">Doorway Ingress:</span> Students tap their cards. Headcounts
                  and timestamps update in real-time.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <span className="font-semibold text-white">Dynamic Recalculation:</span> Move the punctuality sliders
                  at any time to reclassify late arrivals.
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center font-mono text-[11px] font-bold shrink-0 mt-0.5">
                  4
                </div>
                <div>
                  <span className="font-semibold text-white">End &amp; Archival:</span> Terminating locks the physical
                  door and compiles certified PDF and Excel reports.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
