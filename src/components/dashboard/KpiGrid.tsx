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
          <span className="text-hud-secondary font-semibold">ATTENDANCE RATE:</span>
          <span className="font-bold text-sky-400 bg-sky-500/15 border border-sky-500/30 px-3 py-1 rounded-full num-tabular shadow-sm">
            {attendanceRate}%
          </span>
        </div>
      }
      bodyClassName="p-6 space-y-6"
    >
      {/* 6 Clean Individual Register Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Enrolled */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 dark:bg-hud-elevated/60 dark:border-hud-border/80 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="text-xs font-semibold text-slate-600 dark:text-hud-secondary uppercase tracking-wider flex items-center justify-between">
            <span>Enrolled</span>
            <Users className="w-4 h-4 text-slate-400 dark:text-hud-muted" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-slate-900 dark:text-hud-text mt-2 num-tabular">
            {String(stats.totalEnrolled).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 dark:text-hud-muted mt-1 font-body">
            Manifest Total
          </div>
        </div>

        {/* Present (On-Time) */}
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 dark:bg-emerald-500/10 dark:border-emerald-500/30 rounded-2xl shadow-sm hover:border-emerald-300 transition-all">
          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Present</span>
            <UserCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-emerald-600 dark:text-emerald-400 mt-2 num-tabular">
            {String(stats.present).padStart(2, '0')}
          </div>
          <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 font-body">
            On-Time
          </div>
        </div>

        {/* Late (Tardy) */}
        <div className="p-4 bg-amber-50/80 border border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30 rounded-2xl shadow-sm hover:border-amber-300 transition-all">
          <div className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Late</span>
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-amber-600 dark:text-amber-400 mt-2 num-tabular">
            {String(stats.late).padStart(2, '0')}
          </div>
          <div className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 font-body">
            Grace Window
          </div>
        </div>

        {/* Cut Class */}
        <div className="p-4 bg-rose-50/80 border border-rose-200 dark:bg-rose-500/10 dark:border-rose-500/30 rounded-2xl shadow-sm hover:border-rose-300 transition-all">
          <div className="text-xs font-bold text-rose-800 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Cut</span>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-rose-600 dark:text-rose-400 mt-2 num-tabular">
            {String(stats.cut).padStart(2, '0')}
          </div>
          <div className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-1 font-body">
            Past Cut-Off
          </div>
        </div>

        {/* Excused */}
        <div className="p-4 bg-sky-50/80 border border-sky-200 dark:bg-sky-500/10 dark:border-sky-500/25 rounded-2xl shadow-sm hover:border-sky-300 transition-all">
          <div className="text-xs font-bold text-sky-800 dark:text-sky-400 uppercase tracking-wider flex items-center justify-between">
            <span>Excused</span>
            <ShieldAlert className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-sky-600 dark:text-sky-300 mt-2 num-tabular">
            {String(stats.excused).padStart(2, '0')}
          </div>
          <div className="text-xs text-sky-700/80 dark:text-slate-400 mt-1 font-body">
            Medical / Slip
          </div>
        </div>

        {/* Absent */}
        <div className="p-4 bg-slate-100/80 border border-slate-200 dark:bg-rose-500/10 dark:border-rose-500/30 rounded-2xl shadow-sm hover:border-slate-300 transition-all">
          <div className="text-xs font-bold text-slate-800 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
            <span>Absent</span>
            <UserX className="w-4 h-4 text-slate-600 dark:text-rose-400" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-slate-800 dark:text-rose-400 mt-2 num-tabular">
            {String(stats.absent).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 dark:text-rose-400/80 mt-1 font-body">
            Unrecorded
          </div>
        </div>
      </div>

      {/* Segmented Distribution Progress Bar */}
      <div className="space-y-2.5 pt-1">
        <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 flex overflow-hidden rounded-full p-0.5 border border-slate-200/80 dark:border-slate-700/80 shadow-inner">
          {attendedCount === 0 ? (
            <div className="w-full h-full bg-slate-200/70 dark:bg-slate-700/40 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-sans font-semibold text-slate-500 dark:text-slate-400">
                Awaiting student ingress interrogation...
              </span>
            </div>
          ) : (
            <>
              <div style={{ width: `${presentPercent}%` }} className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" title={`Present: ${stats.present}`} />
              <div style={{ width: `${latePercent}%` }} className="h-full bg-amber-500 transition-all duration-500" title={`Late: ${stats.late}`} />
              <div style={{ width: `${cutPercent}%` }} className="h-full bg-rose-500/80 transition-all duration-500" title={`Cut: ${stats.cut}`} />
              <div style={{ width: `${excusedPercent}%` }} className="h-full bg-sky-500 transition-all duration-500" title={`Excused: ${stats.excused}`} />
              <div style={{ width: `${absentPercent}%` }} className="h-full bg-slate-300 dark:bg-slate-700 rounded-r-full transition-all duration-500" title={`Absent: ${stats.absent}`} />
            </>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-hud-secondary gap-2">
          <div className="font-sans">
            Verified Headcount:{' '}
            <strong className="text-slate-900 dark:text-white font-extrabold font-mono text-sm">
              {attendedCount}
            </strong>{' '}
            of <span className="font-mono font-semibold">{stats.totalEnrolled}</span> students inducted
          </div>
          <div className="flex flex-wrap items-center gap-3.5 text-xs font-medium">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" /> Present ({stats.present})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm" /> Late ({stats.late})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" /> Cut ({stats.cut})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm" /> Excused ({stats.excused})</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 shadow-sm" /> Absent ({stats.absent})</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default KpiGrid;
