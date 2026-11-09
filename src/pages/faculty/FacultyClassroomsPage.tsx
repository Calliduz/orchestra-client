import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Radio, Users, Clock, ArrowRight, Play, CheckCircle2, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react';
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-900/40 border border-blue-500/20 p-6 md:p-8">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono mb-3">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>INSTRUCTOR CONSOLE &bull; ORCHESTRA v1.0.4</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
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
              className="gap-2 bg-blue-600 hover:bg-blue-500"
            >
              <Radio className="w-4 h-4" />
              <span>Launch Live Session Console</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/faculty/reports')}
              className="gap-2"
            >
              <span>View Past Attendance Reports &rarr;</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Classroom Section Cards */}
      <div className="space-y-4">
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
          <Button variant="outline" size="sm" onClick={fetchMySections} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>

        {sections.length === 0 ? (
          <Card className="p-8 text-center text-slate-400">
            <p>No classroom sections assigned to your faculty profile yet.</p>
            <p className="text-xs text-slate-500 mt-1">Please contact your administrator to assign course sections.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sections.map((sec) => {
              const hasActive = sec.sessions && sec.sessions.length > 0;
              return (
                <Card
                  key={sec.id}
                  className={`p-5 flex flex-col justify-between transition-all duration-150 ${
                    hasActive
                      ? 'border-emerald-500/50 bg-gradient-to-b from-emerald-950/20 to-slate-900 shadow-lg shadow-emerald-500/5'
                      : 'hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {sec.sectionCode}
                      </span>
                      {hasActive ? (
                        <span className="flex items-center gap-1.5 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          LIVE SESSION
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-500">STANDBY</span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug">{sec.courseName}</h3>

                    {/* Metadata details */}
                    <div className="mt-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80 text-slate-300">
                        <span className="text-slate-400">Classroom:</span>
                        <span className="font-mono text-white font-medium">{sec.roomNumber}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80 text-slate-300">
                        <span className="text-slate-400">Terminal Node:</span>
                        <span className="font-mono text-slate-300">{sec.terminalId}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-slate-800/80 text-slate-300">
                        <span className="text-slate-400">Enrolled Students:</span>
                        <span className="font-mono text-emerald-400 font-bold">{sec._count.enrollments} Students</span>
                      </div>
                      <div className="flex items-center justify-between py-1 text-slate-300">
                        <span className="text-slate-400">Punctuality Grace:</span>
                        <span className="font-mono text-slate-300 text-[11px]">
                          Late: {sec.defaultLateThresholdMins}m &bull; Cut: {sec.defaultCutThresholdMins}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => navigate(`/faculty/reports?sectionId=${sec.id}`)}
                      className="text-xs text-slate-400 hover:text-white transition"
                    >
                      History ({sec._count.sessions}) &rarr;
                    </button>
                    {hasActive ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => navigate('/faculty/live')}
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500"
                      >
                        <Radio className="w-3.5 h-3.5" />
                        <span>Live Session</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={startingSectionId === sec.id}
                        onClick={() => handleStartSession(sec.id)}
                        className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{startingSectionId === sec.id ? 'Starting...' : 'Start Session'}</span>
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
