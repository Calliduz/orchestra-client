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
      title="Hardware Ingress Telemetry &amp; Roster Register"
      subtitle="Real-time headcount cross-referenced against section enrollment manifest"
      action={
        <div className="flex items-center gap-2.5 font-mono text-[11px]">
          <span className="text-[#8C98A8]">RATE:</span>
          <span className="font-bold text-[#CCFF00] bg-[#12200A] border border-[#29420D] px-2 py-0.5 num-tabular">
            {attendanceRate}%
          </span>
        </div>
      }
      bodyClassName="p-4 space-y-4"
    >
      {/* Consolidated Precision Multi-Register Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 border border-[#1E2632] divide-y sm:divide-y-0 sm:divide-x divide-[#1E2632] bg-[#0A0D12]">
        {/* Total Enrolled */}
        <div className="p-3.5 hover:bg-[#11161F] transition-colors">
          <div className="text-[10px] font-mono text-[#8C98A8] uppercase tracking-wider flex items-center justify-between">
            <span>Enrolled</span>
            <Users className="w-3.5 h-3.5 text-[#8C98A8]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#F1F5F9] mt-1.5 num-tabular">
            {String(stats.totalEnrolled).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono text-[#6A7888] mt-0.5">
            100% manifest
          </div>
        </div>

        {/* Present (On-Time) */}
        <div className="p-3.5 bg-[#12200A]/30 hover:bg-[#12200A]/50 transition-colors">
          <div className="text-[10px] font-mono text-[#CCFF00] uppercase tracking-wider flex items-center justify-between">
            <span>Present</span>
            <UserCheck className="w-3.5 h-3.5 text-[#CCFF00]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#CCFF00] mt-1.5 num-tabular">
            {String(stats.present).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono text-[#A3E635]/70 mt-0.5">
            &le; Late threshold
          </div>
        </div>

        {/* Late (Tardy) */}
        <div className="p-3.5 bg-[#201503]/30 hover:bg-[#201503]/50 transition-colors">
          <div className="text-[10px] font-mono text-[#F59E0B] uppercase tracking-wider flex items-center justify-between">
            <span>Late</span>
            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#F59E0B] mt-1.5 num-tabular">
            {String(stats.late).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono text-[#F59E0B]/70 mt-0.5">
            Tardy grace bracket
          </div>
        </div>

        {/* Cut Class */}
        <div className="p-3.5 bg-[#241103]/30 hover:bg-[#241103]/50 transition-colors">
          <div className="text-[10px] font-mono text-[#FB923C] uppercase tracking-wider flex items-center justify-between">
            <span>Cut</span>
            <AlertTriangle className="w-3.5 h-3.5 text-[#FB923C]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#FB923C] mt-1.5 num-tabular">
            {String(stats.cut).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono text-[#FB923C]/70 mt-0.5">
            &gt; Cut threshold
          </div>
        </div>

        {/* Excused */}
        <div className="p-3.5 bg-[#081822]/30 hover:bg-[#081822]/50 transition-colors">
          <div className="text-[10px] font-mono text-[#38BDF8] uppercase tracking-wider flex items-center justify-between">
            <span>Excused</span>
            <ShieldAlert className="w-3.5 h-3.5 text-[#38BDF8]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#38BDF8] mt-1.5 num-tabular">
            {String(stats.excused).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono text-[#38BDF8]/70 mt-0.5">
            Medical / Official
          </div>
        </div>

        {/* Absent */}
        <div className="p-3.5 bg-[#220B0B]/30 hover:bg-[#220B0B]/50 transition-colors">
          <div className="text-[10px] font-mono text-[#F87171] uppercase tracking-wider flex items-center justify-between">
            <span>Absent</span>
            <UserX className="w-3.5 h-3.5 text-[#F87171]" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#F87171] mt-1.5 num-tabular">
            {String(stats.absent).padStart(2, '0')}
          </div>
          <div className="text-[10px] font-mono text-[#F87171]/70 mt-0.5">
            Unrecorded at close
          </div>
        </div>
      </div>

      {/* Real-time segmented distribution progress bar */}
      <div className="space-y-1.5">
        <div className="w-full h-1.5 bg-[#141B24] flex overflow-hidden border border-[#1E2632]">
          <div style={{ width: `${presentPercent}%` }} className="h-full bg-[#CCFF00] transition-all duration-300" title={`Present: ${stats.present}`} />
          <div style={{ width: `${latePercent}%` }} className="h-full bg-[#F59E0B] transition-all duration-300" title={`Late: ${stats.late}`} />
          <div style={{ width: `${cutPercent}%` }} className="h-full bg-[#FB923C] transition-all duration-300" title={`Cut: ${stats.cut}`} />
          <div style={{ width: `${excusedPercent}%` }} className="h-full bg-[#38BDF8] transition-all duration-300" title={`Excused: ${stats.excused}`} />
          <div style={{ width: `${absentPercent}%` }} className="h-full bg-[#EF4444] transition-all duration-300" title={`Absent: ${stats.absent}`} />
        </div>
        <div className="flex justify-between items-center text-[10px] font-mono text-[#6A7888]">
          <span>HEADCOUNT: <strong className="text-[#F1F5F9]">{attendedCount}</strong> / {stats.totalEnrolled}</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#CCFF00]" /> Present</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#F59E0B]" /> Late</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#FB923C]" /> Cut</span>
            <span className="flex items-center gap-1"><span className="w-2 h-0.5 bg-[#EF4444]" /> Absent</span>
          </span>
        </div>
      </div>
    </Card>
  );
};

export default KpiGrid;
