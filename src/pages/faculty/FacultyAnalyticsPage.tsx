import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  Clock,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  RefreshCw,
  Award,
  PieChart as PieIcon,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
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

// Custom Glassmorphic Tooltip for Recharts
const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-slate-900/95 border border-white/10 p-3 shadow-xl backdrop-blur-md text-xs">
        <div className="font-bold text-white mb-2 border-b border-white/[0.08] pb-1 font-mono">
          {label}
        </div>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}:</span>
              </span>
              <span className="font-mono font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
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

  const totalLogsCount = summary
    ? summary.distribution.present +
      summary.distribution.late +
      summary.distribution.cut +
      summary.distribution.absent +
      summary.distribution.excused
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Punctuality &amp; Attendance Analytics</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Visual metrics, historical attendance distribution, and student tardiness ranking across your courses
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAnalyticsData}
          disabled={isLoading}
          className="gap-2 border-white/[0.08] hover:bg-white/[0.04]"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </Button>
      </div>

      {/* KPI Stat Cards: Smooth Hairline Top Gradients instead of protruding left borders */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Attendance Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/80 to-emerald-500/0" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Attendance Rate</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1.5 font-mono">
            {summary ? `${summary.avgAttendanceRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Overall enrolled rate</div>
        </div>

        {/* Tardiness Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500/80 to-amber-500/0" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Tardiness Rate</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400 mt-1.5 font-mono">
            {summary ? `${summary.tardinessRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Past grace window</div>
        </div>

        {/* Cut Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500/80 to-orange-500/0" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Cut Rate</span>
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <div className="text-2xl font-extrabold text-orange-400 mt-1.5 font-mono">
            {summary ? `${summary.cutRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Over 45 mins late</div>
        </div>

        {/* Absence Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-500/80 to-rose-500/0" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Absence Rate</span>
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400 mt-1.5 font-mono">
            {summary ? `${summary.absenceRate}%` : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Unlogged taps</div>
        </div>

        {/* Conducted Sessions */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/80 to-blue-500/0" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Conducted</span>
            <Calendar className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-2xl font-extrabold text-blue-400 mt-1.5 font-mono">
            {summary ? summary.totalSessionsConducted : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Finalized classes</div>
        </div>

        {/* Total Students */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm relative overflow-hidden group hover:border-white/[0.12] transition">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/80 to-purple-500/0" />
          <div className="text-[10px] font-mono uppercase text-slate-400 font-bold flex items-center justify-between">
            <span>Total Students</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-extrabold text-purple-400 mt-1.5 font-mono">
            {summary ? summary.totalStudentsEnrolled : '—'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Roster total</div>
        </div>
      </div>

      {/* Visual Graphs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Bar Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm lg:col-span-2">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.6} />
                  <XAxis
                    dataKey="shortDate"
                    stroke="#64748B"
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    tickFormatter={(val, i) => `${val} #${i + 1}`}
                  />
                  <YAxis stroke="#64748B" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="present" name="Present" fill="#10B981" stackId="a" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="late" name="Late (Tardy)" fill="#F59E0B" stackId="a" />
                  <Bar dataKey="cut" name="Cut" fill="#F97316" stackId="a" />
                  <Bar dataKey="absent" name="Absent" fill="#EF4444" stackId="a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Punctuality Distribution Donut Chart */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-purple-400" />
                <span>Overall Punctuality Ratio</span>
              </h2>
              <p className="text-[11px] text-slate-400">Distribution across all historical logs</p>
            </div>

            <div className="h-56 w-full relative">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                  No attendance logs recorded yet
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs font-mono font-bold text-white">{totalLogsCount}</span>
                    <span className="text-[9px] uppercase tracking-wider text-slate-400">Logs</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-white/[0.06] text-[11px]">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-300 truncate">{item.name}:</span>
                <span className="font-mono font-bold text-white ml-auto">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Tardiness Leaderboard Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-white/[0.05] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Student Tardiness &amp; Punctuality Ranking</span>
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
              <tr className="border-b border-white/[0.05] bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
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
            <tbody className="divide-y divide-white/[0.04]">
              {studentLeaderboard.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No student attendance logs compiled yet
                  </td>
                </tr>
              ) : (
                studentLeaderboard.map((item, idx) => {
                  const initials = item.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono text-slate-500 text-center">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-800 border border-white/[0.06] text-sky-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-200">{item.fullName}</div>
                            <div className="text-[11px] text-slate-400 truncate">{item.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">{item.studentNumber}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{item.sections}</td>
                      <td className="py-3 px-4 text-center font-mono">
                        {item.lateCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px]">
                            {item.lateCount}
                          </span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {item.cutCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[11px]">
                            {item.cutCount}
                          </span>
                        ) : (
                          <span className="text-slate-600">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        {item.absentCount > 0 ? (
                          <span className="px-2 py-0.5 rounded-full font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px]">
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
                        <div className="inline-flex items-center gap-2 justify-end">
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
