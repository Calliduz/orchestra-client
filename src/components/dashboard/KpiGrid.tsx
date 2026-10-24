import React from 'react';
import { Users, UserCheck, Clock, UserX, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Card } from '../ui/Card.js';

interface KpiStats {
  totalEnrolled: number;
  present: number;
  late: number;
  cut: number;
  excused: number;
  absent: number;
}

interface KpiGridProps {
  stats: KpiStats;
}

export const KpiGrid: React.FC<KpiGridProps> = ({ stats }) => {
  const attendedCount = stats.present + stats.late + stats.excused;
  const attendanceRate =
    stats.totalEnrolled > 0
      ? ((attendedCount / stats.totalEnrolled) * 100).toFixed(1)
      : '0.0';

  const presentPercent = stats.totalEnrolled > 0 ? (stats.present / stats.totalEnrolled) * 100 : 0;
  const latePercent = stats.totalEnrolled > 0 ? (stats.late / stats.totalEnrolled) * 100 : 0;
  const cutPercent = stats.totalEnrolled > 0 ? (stats.cut / stats.totalEnrolled) * 100 : 0;
  const excusedPercent = stats.totalEnrolled > 0 ? (stats.excused / stats.totalEnrolled) * 100 : 0;
  const absentPercent = stats.totalEnrolled > 0 ? (stats.absent / stats.totalEnrolled) * 100 : 0;

  return (
    <Card
      title="Attendance Telemetry & Headcount Register"
      subtitle="Live headcount cross-referenced against section enrollment manifest"
      action={
        <div className="flex items-center gap-2 text-xs">
          <span className="text-hud-secondary font-medium">ATTENDANCE RATE:</span>
          <span className="font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg num-tabular">
            {attendanceRate}%
          </span>
        </div>
      }
      bodyClassName="p-5 space-y-5"
    >
      {/* 6 Clean Individual Register Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Enrolled */}
        <div className="p-4 bg-hud-elevated/40 border border-hud-border/70 rounded-xl hover:border-white/20 transition-all">
          <div className="text-xs font-medium text-hud-secondary uppercase tracking-wider flex items-center justify-between">
            <span>Enrolled</span>
            <Users className="w-4 h-4 text-hud-muted" />
          </div>
          <div className="text-3xl font-bold font-mono text-hud-text mt-2 num-tabular">
            {String(stats.totalEnrolled).padStart(2, '0')}
          </div>
          <div className="text-xs text-hud-muted mt-1">
            Manifest Total
          </div>
        </div>

        {/* Present (On-Time) */}
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl hover:border-emerald-500/40 transition-all">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Present</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-2 num-tabular">
            {String(stats.present).padStart(2, '0')}
          </div>
          <div className="text-xs text-emerald-400/80 mt-1">
            On-Time
          </div>
        </div>

        {/* Late (Tardy) */}
        <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-xl hover:border-amber-500/40 transition-all">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Late</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-2 num-tabular">
            {String(stats.late).padStart(2, '0')}
          </div>
          <div className="text-xs text-amber-400/80 mt-1">
            Grace Window
          </div>
        </div>

        {/* Cut Class */}
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl hover:border-rose-500/40 transition-all">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Cut</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400 mt-2 num-tabular">
            {String(stats.cut).padStart(2, '0')}
          </div>
          <div className="text-xs text-rose-400/80 mt-1">
            Past Cut-Off
          </div>
        </div>

        {/* Excused */}
        <div className="p-4 bg-slate-500/10 border border-slate-500/20 rounded-xl hover:border-slate-500/30 transition-all">
          <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Excused</span>
            <ShieldAlert className="w-4 h-4 text-slate-300" />
          </div>
          <div className="text-3xl font-bold font-mono text-slate-300 mt-2 num-tabular">
            {String(stats.excused).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Medical / Slip
          </div>
        </div>

        {/* Absent */}
        <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl hover:border-rose-500/40 transition-all">
          <div className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Absent</span>
            <UserX className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-rose-400 mt-2 num-tabular">
            {String(stats.absent).padStart(2, '0')}
          </div>
          <div className="text-xs text-rose-400/80 mt-1">
            Unrecorded
          </div>
        </div>
      </div>

      {/* Segmented Distribution Progress Bar */}
      <div className="space-y-2 pt-1">
        <div className="w-full h-2.5 bg-hud-elevated/70 flex overflow-hidden rounded-full">
          <div style={{ width: `${presentPercent}%` }} className="h-full bg-emerald-500 transition-all duration-300" title={`Present: ${stats.present}`} />
          <div style={{ width: `${latePercent}%` }} className="h-full bg-amber-500 transition-all duration-300" title={`Late: ${stats.late}`} />
          <div style={{ width: `${cutPercent}%` }} className="h-full bg-rose-500/70 transition-all duration-300" title={`Cut: ${stats.cut}`} />
          <div style={{ width: `${excusedPercent}%` }} className="h-full bg-slate-400 transition-all duration-300" title={`Excused: ${stats.excused}`} />
          <div style={{ width: `${absentPercent}%` }} className="h-full bg-rose-500 transition-all duration-300" title={`Absent: ${stats.absent}`} />
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-hud-secondary gap-2">
          <div>
            Verified Headcount: <strong className="text-white font-medium">{attendedCount}</strong> of {stats.totalEnrolled} students present
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Present</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Late</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Cut / Absent</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400" /> Excused</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default KpiGrid;
