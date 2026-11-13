import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  PowerOff,
  Clock,
  RefreshCw,
  MapPin,
  Cpu,
  User,
} from 'lucide-react';
import { Button } from '../ui/Button.js';
import { Badge } from '../ui/Badge.js';
import { Modal } from '../ui/Modal.js';
import { CopyButton } from '../ui/CopyButton.js';
import { API_V1_URL } from '../../config/api.js';

export interface SessionData {
  id: string;
  sectionCode: string;
  courseName: string;
  roomNumber: string;
  facultyName: string;
  startTime: string;
  lateThresholdMins: number;
  cutThresholdMins: number;
}

interface SessionHeaderProps {
  isLocked: boolean;
  terminalId: string;
  sectionCode?: string;
  courseName?: string;
  roomNumber?: string;
  session: SessionData | null;
  onCloseSession: (sessionId: string) => Promise<void>;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  isLocked,
  terminalId,
  sectionCode = 'AR101-BSIT3A',
  courseName = 'Computer Architecture and Organization',
  roomNumber = 'LAB-304',
  session,
  onCloseSession,
  onRefresh,
  isRefreshing = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (!session?.startTime) {
      setElapsedTime('00:00:00');
      return;
    }

    const startMs = new Date(session.startTime).getTime();

    const updateTimer = () => {
      const diffSecs = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
      const hours = Math.floor(diffSecs / 3600);
      const minutes = Math.floor((diffSecs % 3600) / 60);
      const seconds = diffSecs % 60;
      setElapsedTime(
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [session?.startTime]);

  const handleConfirmClose = async () => {
    if (!session) return;
    try {
      setIsClosing(true);
      await onCloseSession(session.id);
      setShowCloseModal(false);
    } catch (err) {
      console.error('Failed to close session', err);
    } finally {
      setIsClosing(false);
    }
  };

  const handleDownload = (type: 'pdf' | 'csv' | 'xlsx') => {
    if (!session) return;
    const url = `${API_V1_URL}/sessions/${session.id}/export/${type}`;
    window.open(url, '_blank');
  };

  return (
    <div className="w-full rounded-2xl bg-hud-surface text-hud-text p-6 shadow-sm border border-hud-border relative overflow-hidden">
      {/* Subtle Ambient Radial Mesh Glows */}
      <div className="absolute -right-24 -top-24 w-96 h-96 bg-sky-500/5 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Section Specs & Academic Telemetry Status */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full font-sans text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                isLocked
                  ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isLocked ? 'bg-amber-400' : 'bg-emerald-400 animate-ping'
                }`}
              />
              {isLocked ? 'Hardware Session Locked' : 'Live Academic Session'}
            </span>

            <span className="text-slate-600 font-sans text-xs hidden sm:inline">•</span>

            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              Room: <strong className="text-slate-200 font-medium">{session?.roomNumber || roomNumber}</strong>
            </span>

            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              Node: <strong className="text-sky-400 font-mono font-medium">{terminalId}</strong>
              <CopyButton text={terminalId} label="" className="p-0 ml-0.5 text-slate-500 hover:text-sky-400" />
            </span>
          </div>

          <h1 className="font-sans font-extrabold text-2xl sm:text-3xl text-white tracking-tight">
            {session?.sectionCode || sectionCode}{' '}
            <span className="text-slate-600 font-normal">·</span>{' '}
            {session?.courseName || courseName}
          </h1>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 font-body">
            {session?.facultyName && (
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                Instructor: <strong className="text-slate-200 font-medium">{session.facultyName}</strong>
              </span>
            )}
            <span>•</span>
            <span>Hardware Boundary Enforced via SPI MFRC522</span>
          </div>
        </div>

        {/* Right: Operational Controls & Session Clock */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Clean Session Clock */}
          <div className="flex items-center gap-4 bg-slate-900/40 border border-white/[0.06] px-4 py-2.5 rounded-xl shadow-xs transition-all hover:border-white/[0.1]">
            <div className="flex flex-col items-center justify-center pr-3.5 border-r border-white/[0.06]">
              <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-400">
                Session Clock
              </span>
              <span className="font-mono text-xl sm:text-2xl font-extrabold text-emerald-400 num-tabular tracking-wider">
                {elapsedTime}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isLocked ? 'Standby Ingress' : 'Auto-Ingress Active'}
              </span>
              <span className="text-slate-500 font-mono text-[10px] tracking-tight">13.56 MHz HF • ISO 14443A</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onRefresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            >
              Sync
            </Button>

            {session && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload('xlsx')}
                  leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />}
                >
                  Excel
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload('pdf')}
                  leftIcon={<FileText className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />}
                >
                  PDF
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownload('csv')}
                  leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />}
                >
                  CSV
                </Button>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setShowCloseModal(true)}
                  leftIcon={<PowerOff className="w-3.5 h-3.5" />}
                >
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Session Close */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Terminate Attendance Session"
        confirmLabel="Yes, Terminate & Compile Roster"
        confirmVariant="danger"
        onConfirm={handleConfirmClose}
        isLoading={isClosing}
      >
        <div className="space-y-3 text-sm text-hud-secondary font-body">
          <p>
            You are about to close the active attendance ingress for section{' '}
            <strong className="text-hud-text">{session?.sectionCode || sectionCode}</strong> on terminal{' '}
            <strong className="text-emerald-500 dark:text-emerald-400 font-mono">{terminalId}</strong>.
          </p>
          <div className="p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs space-y-1.5">
            <div className="text-hud-text font-semibold">Immediate Automated Outcomes:</div>
            <ul className="list-disc pl-4 space-y-0.5 text-hud-secondary">
              <li>Terminal hardware returns to <code>LOCKED</code> standby state.</li>
              <li>Unrecorded students will be classified as <code>ABSENT</code>.</li>
              <li>Official PDF and CSV attendance manifests will be compiled.</li>
              <li>Automated email notifications dispatched to faculty.</li>
            </ul>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SessionHeader;
