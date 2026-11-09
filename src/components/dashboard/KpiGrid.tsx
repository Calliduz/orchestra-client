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
          <span className="text-slate-400 font-medium">ATTENDANCE RATE:</span>
          <span className="font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-3 py-0.5 rounded-full num-tabular">
            {attendanceRate}%
          </span>
        </div>
      }
      bodyClassName="p-6 space-y-6"
    >
      {/* 6 Clean Individual Register Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Enrolled */}
        <div className="p-4 bg-slate-900/40 border border-white/[0.06] rounded-2xl transition-all hover:bg-slate-800/40 hover:border-white/[0.12] group">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Enrolled</span>
            <Users className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-white mt-2 num-tabular">
            {String(stats.totalEnrolled).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-body">
            Manifest Total
          </div>
        </div>

        {/* Present (On-Time) */}
        <div className="p-4 bg-emerald-500/[0.04] border border-emerald-500/20 rounded-2xl transition-all hover:bg-emerald-500/[0.07] hover:border-emerald-500/35 group">
          <div className="text-xs font-bold text-emerald-400/90 uppercase tracking-wider flex items-center justify-between">
            <span>Present</span>
            <UserCheck className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-emerald-400 mt-2 num-tabular drop-shadow-[0_0_12px_rgba(16,185,129,0.25)]">
            {String(stats.present).padStart(2, '0')}
          </div>
          <div className="text-xs text-emerald-300/70 mt-1 font-body">
            On-Time
          </div>
        </div>

        {/* Late (Tardy) */}
        <div className="p-4 bg-amber-500/[0.04] border border-amber-500/20 rounded-2xl transition-all hover:bg-amber-500/[0.07] hover:border-amber-500/35 group">
          <div className="text-xs font-bold text-amber-400/90 uppercase tracking-wider flex items-center justify-between">
            <span>Late</span>
            <Clock className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-amber-400 mt-2 num-tabular drop-shadow-[0_0_12px_rgba(245,158,11,0.25)]">
            {String(stats.late).padStart(2, '0')}
          </div>
          <div className="text-xs text-amber-300/70 mt-1 font-body">
            Grace Window
          </div>
        </div>

        {/* Cut Class */}
        <div className="p-4 bg-rose-500/[0.04] border border-rose-500/20 rounded-2xl transition-all hover:bg-rose-500/[0.07] hover:border-rose-500/35 group">
          <div className="text-xs font-bold text-rose-400/90 uppercase tracking-wider flex items-center justify-between">
            <span>Cut</span>
            <AlertTriangle className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-rose-400 mt-2 num-tabular drop-shadow-[0_0_12px_rgba(244,63,94,0.25)]">
            {String(stats.cut).padStart(2, '0')}
          </div>
          <div className="text-xs text-rose-300/70 mt-1 font-body">
            Past Cut-Off
          </div>
        </div>

        {/* Excused */}
        <div className="p-4 bg-sky-500/[0.04] border border-sky-500/20 rounded-2xl transition-all hover:bg-sky-500/[0.07] hover:border-sky-500/35 group">
          <div className="text-xs font-bold text-sky-400/90 uppercase tracking-wider flex items-center justify-between">
            <span>Excused</span>
            <ShieldAlert className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-sky-300 mt-2 num-tabular drop-shadow-[0_0_12px_rgba(56,189,248,0.25)]">
            {String(stats.excused).padStart(2, '0')}
          </div>
          <div className="text-xs text-sky-300/70 mt-1 font-body">
            Medical / Slip
          </div>
        </div>

        {/* Absent */}
        <div className="p-4 bg-slate-900/40 border border-white/[0.06] rounded-2xl transition-all hover:bg-slate-800/40 hover:border-white/[0.12] group">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Absent</span>
            <UserX className="w-4 h-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
          </div>
          <div className="text-3xl font-extrabold font-sans text-slate-200 mt-2 num-tabular">
            {String(stats.absent).padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-400 mt-1 font-body">
            Unrecorded
          </div>
        </div>
      </div>

      {/* Segmented Distribution Progress Bar */}
      <div className="space-y-2.5 pt-1">
        <div className="w-full h-2.5 bg-slate-900/80 flex overflow-hidden rounded-full p-0.5 border border-white/[0.06]">
          {attendedCount === 0 ? (
            <div className="w-full h-full bg-slate-800/60 rounded-full flex items-center justify-center">
              <span className="text-[10px] font-sans font-semibold text-slate-400">
                Awaiting student ingress interrogation...
              </span>
            </div>
          ) : (
            <>
              <div style={{ width: `${presentPercent}%` }} className="h-full bg-emerald-500 rounded-l-full transition-all duration-500" title={`Present: ${stats.present}`} />
              <div style={{ width: `${latePercent}%` }} className="h-full bg-amber-500 transition-all duration-500" title={`Late: ${stats.late}`} />
              <div style={{ width: `${cutPercent}%` }} className="h-full bg-rose-500/80 transition-all duration-500" title={`Cut: ${stats.cut}`} />
              <div style={{ width: `${excusedPercent}%` }} className="h-full bg-sky-500 transition-all duration-500" title={`Excused: ${stats.excused}`} />
              <div style={{ width: `${absentPercent}%` }} className="h-full bg-slate-700 rounded-r-full transition-all duration-500" title={`Absent: ${stats.absent}`} />
            </>
          )}
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs text-hud-secondary gap-2">
          <div className="font-sans">
            Verified Headcount:{' '}
            <strong className="text-white font-extrabold font-mono text-sm">
              {attendedCount}
            </strong>{' '}
            of <span className="font-mono font-semibold text-slate-300">{stats.totalEnrolled}</span> students inducted
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
