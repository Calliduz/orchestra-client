import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, BookOpen, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
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
        <Button variant="outline" size="sm" onClick={fetchStudents} disabled={isLoading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Directory</span>
        </Button>
      </div>

      {/* Filter / Search Card */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, ID number, or section..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs font-mono text-slate-400">
            Total Students: <strong className="text-white">{filtered.length}</strong>
          </div>
        </div>
      </Card>

      {/* Students Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Student Name & Email</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Enrolled Section</th>
                <th className="py-3 px-4">RFID UID</th>
                <th className="py-3 px-4 text-center">Sessions Tracked</th>
                <th className="py-3 px-4 text-center">Punctuality Score</th>
                <th className="py-3 px-4 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500">
                    No students found matching search
                  </td>
                </tr>
              ) : (
                filtered.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{student.fullName}</div>
                      <div className="text-[11px] text-slate-400">{student.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{student.studentNumber}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {student.sections}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {student.rfidUid ? (
                        <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                          0x{student.rfidUid}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">No Badge</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-slate-300">
                      {student.totalSessions} Sessions
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-emerald-400" title="Present">{student.presentCount}P</span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="text-amber-400" title="Late">{student.lateCount}L</span>
                        <span className="text-slate-600">&bull;</span>
                        <span className="text-rose-400" title="Absent">{student.absentCount}A</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

