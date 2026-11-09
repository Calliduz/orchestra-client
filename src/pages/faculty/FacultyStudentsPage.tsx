import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, BookOpen, CheckCircle2, AlertCircle, Clock, Tag, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface StudentRosterItem {
  id: string;
  studentNumber: string;
  fullName: string;
  email: string;
  rfidUid: string | null;
  sections: string;
  totalSessions: number;
  presentCount: number;
  lateCount: number;
  cutCount: number;
  absentCount: number;
  attendanceRate: number;
}

export const FacultyStudentsPage: React.FC = () => {
  const { token } = useAuth();
  const [students, setStudents] = useState<StudentRosterItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_V1_URL}/analytics/student-punctuality`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setStudents(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.studentNumber.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      s.sections.toLowerCase().includes(q)
    );
  });

  const totalWithRfid = students.filter((s) => Boolean(s.rfidUid)).length;
  const goodStandingCount = students.filter((s) => s.attendanceRate >= 80).length;
  const attentionCount = students.filter((s) => s.attendanceRate < 60 && s.totalSessions > 0).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-400" />
            <span>Enrolled Students Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Master roster of all students enrolled in your course sections and their overall attendance standing
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStudents}
          disabled={isLoading}
          className="gap-2 border-white/[0.08] hover:bg-white/[0.04]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </Button>
      </div>

      {/* Roster Overview Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Total Students</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{students.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Enrolled manifest</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Provisioned Badges</div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono mt-1">{totalWithRfid}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">RFID credentials active</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Good Standing</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{goodStandingCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">&ge; 80% attendance</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Needs Intervention</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{attentionCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">&lt; 60% attendance</div>
        </div>
      </div>

      {/* Filter / Search Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, ID number, or section..."
              className="w-full bg-slate-950/70 border border-white/[0.08] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div className="text-xs font-mono text-slate-400">
            Records matched: <strong className="text-white">{filtered.length}</strong> of {students.length}
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.05] bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Student Name &amp; Email</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Enrolled Section</th>
                <th className="py-3 px-4">RFID UID</th>
                <th className="py-3 px-4 text-center">Sessions Tracked</th>
                <th className="py-3 px-4 text-center">Punctuality Standing</th>
                <th className="py-3 px-4 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    No students found matching current search criteria
                  </td>
                </tr>
              ) : (
                filtered.map((student, idx) => {
                  const initials = student.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-center">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/[0.06] text-sky-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-200">{student.fullName}</div>
                            <div className="text-[11px] text-slate-400 truncate">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{student.studentNumber}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                          {student.sections}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {student.rfidUid ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                            <Tag className="w-3 h-3" />
                            <span>0x{student.rfidUid}</span>
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">No Badge Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-slate-300">
                        {student.totalSessions} Classes
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                          <span
                            className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            title="Present count"
                          >
                            {student.presentCount}P
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            title="Late count"
                          >
                            {student.lateCount}L
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            title="Absent count"
                          >
                            {student.absentCount}A
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2 justify-end">
                          <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${
                                student.attendanceRate >= 80
                                  ? 'bg-emerald-400'
                                  : student.attendanceRate >= 60
                                  ? 'bg-amber-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${student.attendanceRate}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-slate-200 min-w-[3ch]">
                            {student.attendanceRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
