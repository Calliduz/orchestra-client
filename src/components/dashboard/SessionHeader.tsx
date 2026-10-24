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

interface SessionData {
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

  const handleDownload = (type: 'pdf' | 'csv') => {
    if (!session) return;
    const url = `http://localhost:5000/api/v1/sessions/${session.id}/export/${type}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-hud-surface border border-hud-border/70 p-6 rounded-2xl shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Section Specs & Hardware Status */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-sans font-bold text-2xl text-hud-text tracking-tight">
              {session?.sectionCode || sectionCode}
            </h1>
            <span className="text-hud-muted font-sans">•</span>
            <span className="font-sans text-base text-hud-secondary font-medium">
              {session?.courseName || courseName}
            </span>
            <Badge
              status={isLocked ? 'LOCKED' : 'OPEN'}
              label={isLocked ? 'SESSION LOCKED' : 'INGRESS ACTIVE'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-hud-secondary font-sans">
            <div className="flex items-center gap-1.5 bg-hud-elevated/50 px-2.5 py-1 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-hud-muted" />
              <span className="text-hud-muted">Room:</span>
              <span className="text-hud-text font-medium">{session?.roomNumber || roomNumber}</span>
            </div>

            <div className="flex items-center gap-1.5 bg-hud-elevated/50 px-2.5 py-1 rounded-lg">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-hud-muted">Terminal:</span>
              <span className="text-emerald-400 font-mono font-medium">{terminalId}</span>
              <CopyButton text={terminalId} label="" className="p-0 ml-0.5" />
            </div>

            {session && (
              <div className="flex items-center gap-1.5 bg-hud-elevated/50 px-2.5 py-1 rounded-lg">
                <User className="w-3.5 h-3.5 text-hud-muted" />
                <span className="text-hud-muted">Instructor:</span>
                <span className="text-hud-text font-medium">{session.facultyName}</span>
              </div>
            )}

            {session && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 font-medium px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono num-tabular">Elapsed: {elapsedTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Operational Controls & Artifact Downloads */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
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
                onClick={() => handleDownload('pdf')}
                leftIcon={<FileText className="w-3.5 h-3.5 text-emerald-400" />}
              >
                PDF Manifest
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload('csv')}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-hud-secondary" />}
              >
                CSV Export
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
        <div className="space-y-3 text-sm text-hud-secondary">
          <p>
            You are about to close the active attendance ingress for section{' '}
            <strong className="text-hud-text">{session?.sectionCode || sectionCode}</strong> on terminal{' '}
            <strong className="text-emerald-400 font-mono">{terminalId}</strong>.
          </p>
          <div className="p-3 bg-hud-elevated/60 border border-hud-border/70 rounded-xl text-xs space-y-1">
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
