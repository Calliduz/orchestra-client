import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, AlertTriangle, UserCheck, ShieldAlert, RefreshCw, Award, PieChart as PieIcon } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface FacultySummary {
  totalClassrooms: number;
  totalStudentsEnrolled: number;
  totalSessionsConducted: number;
  avgAttendanceRate: number;
  tardinessRate: number;
  cutRate: number;
  absenceRate: number;
  distribution: {
    present: number;
    late: number;
    cut: number;
    absent: number;
    excused: number;
  };
}

interface TrendItem {
  sessionId: string;
  label: string;
  shortDate: string;
  timeStr: string;
  sectionCode: string;
  present: number;
  late: number;
  cut: number;
  absent: number;
  excused: number;
  total: number;
  attendanceRate: number;
}

interface StudentPunctualityItem {
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
  excusedCount: number;
  attendanceRate: number;
}

const PIE_COLORS = {
  present: '#10B981', // green
  late: '#F59E0B',    // amber
  cut: '#F97316',     // orange
  absent: '#EF4444',  // red
  excused: '#3B82F6', // blue
};

export const FacultyAnalyticsPage: React.FC = () => {
  const { token } = useAuth();

  const [summary, setSummary] = useState<FacultySummary | null>(null);
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [studentLeaderboard, setStudentLeaderboard] = useState<StudentPunctualityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setIsLoading(true);

      const [summaryRes, trendsRes, studentsRes] = await Promise.all([
        fetch(`${API_V1_URL}/analytics/faculty-summary`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_V1_URL}/analytics/attendance-trends`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_V1_URL}/analytics/student-punctuality`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [summaryJson, trendsJson, studentsJson] = await Promise.all([
        summaryRes.json(),
        trendsRes.json(),
        studentsRes.json(),
      ]);

      if (summaryJson.success) setSummary(summaryJson.data);
      if (trendsJson.success) setTrends(trendsJson.data);
      if (studentsJson.success) setStudentLeaderboard(studentsJson.data);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const pieData = summary
    ? [
        { name: 'Present', value: summary.distribution.present, color: PIE_COLORS.present },
        { name: 'Late (Tardy)', value: summary.distribution.late, color: PIE_COLORS.late },
        { name: 'Cut', value: summary.distribution.cut, color: PIE_COLORS.cut },
        { name: 'Absent', value: summary.distribution.absent, color: PIE_COLORS.absent },
        { name: 'Excused', value: summary.distribution.excused, color: PIE_COLORS.excused },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Punctuality & Attendance Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual metrics, historical attendance distribution, and student tardiness ranking across your courses
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalyticsData} disabled={isLoading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </Button>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 border-l-4 border-l-emerald-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Attendance Rate</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {summary ? `${summary.avgAttendanceRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Overall enrolled rate</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-amber-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Tardiness Rate</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">
            {summary ? `${summary.tardinessRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Past grace window</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-orange-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Cut Rate</div>
          <div className="text-2xl font-bold text-orange-400 mt-1">
            {summary ? `${summary.cutRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Over 45 mins late</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-rose-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Absence Rate</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            {summary ? `${summary.absenceRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Unlogged student taps</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-blue-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Conducted Sessions</div>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {summary ? summary.totalSessionsConducted : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Finalized classes</div>
        </Card>

        <Card className="p-4 border-l-4 border-l-purple-500">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold">Total Students</div>
          <div className="text-2xl font-bold text-purple-400 mt-1">
            {summary ? summary.totalStudentsEnrolled : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Unique enrolled roster</div>
        </Card>
      </div>

      {/* Visual Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Bar Chart */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span>Attendance Composition by Session</span>
              </h2>
              <p className="text-[11px] text-slate-400">Headcount breakdown of check-ins per session</p>
            </div>
          </div>

          <div className="h-72 w-full">
            {trends.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No session trend data available yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="shortDate"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                  />
                  <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="present" name="Present" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="late" name="Late (Tardy)" fill="#F59E0B" stackId="a" />
                  <Bar dataKey="cut" name="Cut" fill="#F97316" stackId="a" />
                  <Bar dataKey="absent" name="Absent" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Punctuality Distribution Donut Chart */}
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-purple-400" />
              <span>Overall Punctuality Ratio</span>
            </h2>
            <p className="text-[11px] text-slate-400">Distribution across all historical logs</p>
          </div>

          <div className="h-56 w-full">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No attendance logs recorded yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-slate-800 text-[11px]">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}:</span>
                <span className="font-mono font-bold text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Student Tardiness Leaderboard Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Student Tardiness & Punctuality Ranking</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Sorted by highest late and unlogged frequency to identify students needing intervention
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {studentLeaderboard.length} Enrolled Students Tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">ID Number</th>
                <th className="py-3 px-4">Course Section</th>
                <th className="py-3 px-4 text-center">Late (Tardy)</th>
                <th className="py-3 px-4 text-center">Cut</th>
                <th className="py-3 px-4 text-center">Absent</th>
                <th className="py-3 px-4 text-center">Present</th>
                <th className="py-3 px-4 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {studentLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No student attendance logs compiled yet
                  </td>
                </tr>
              ) : (
                studentLeaderboard.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-200">{item.fullName}</div>
                      <div className="text-[11px] text-slate-400">{item.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{item.studentNumber}</td>
                    <td className="py-3 px-4 font-mono text-slate-400">{item.sections}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.lateCount > 0 ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {item.lateCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.cutCount > 0 ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                          {item.cutCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {item.absentCount > 0 ? (
                        <span className="px-2 py-0.5 rounded font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          {item.absentCount}
                        </span>
                      ) : (
                        <span className="text-slate-600">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-emerald-400 font-bold">
                      {item.presentCount}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full ${
                              item.attendanceRate >= 80
                                ? 'bg-emerald-400'
                                : item.attendanceRate >= 60
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.attendanceRate}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-slate-200 min-w-[3ch]">
                          {item.attendanceRate}%
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

