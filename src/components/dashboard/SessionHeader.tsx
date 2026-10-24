import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Lock,
  Unlock,
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
    <div className="bg-[#0D1117] border border-[#1E2632] p-5 relative corner-hud shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left: Section Specs & Hardware Status */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-sans font-bold text-2xl text-[#F1F5F9] tracking-tight">
              {session?.sectionCode || sectionCode}
            </h1>
            <span className="text-[#3E4A5B] font-mono">•</span>
            <span className="font-sans text-sm text-[#94A3B8] font-medium">
              {session?.courseName || courseName}
            </span>
            <Badge
              status={isLocked ? 'LOCKED' : 'OPEN'}
              label={isLocked ? 'SESSION LOCKED' : 'INGRESS ACTIVE'}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-[#7E8B9B] font-mono">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span>ROOM:</span>
              <span className="text-[#E2E8F0] font-semibold">{session?.roomNumber || roomNumber}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#CCFF00]" />
              <span>TERMINAL:</span>
              <span className="text-[#CCFF00] font-bold">{terminalId}</span>
              <CopyButton text={terminalId} label="" className="border-0 bg-transparent p-0 ml-0.5" />
            </div>
            {session && (
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#94A3B8]" />
                <span>INSTRUCTOR:</span>
                <span className="text-[#E2E8F0]">{session.facultyName}</span>
              </div>
            )}
            {session && (
              <div className="flex items-center gap-1.5 bg-[#12200A] border border-[#29420D] px-2 py-0.5 text-[#CCFF00] font-bold">
                <Clock className="w-3 h-3" />
                <span className="num-tabular">ELAPSED: {elapsedTime}</span>
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
                leftIcon={<FileText className="w-3.5 h-3.5 text-[#CCFF00]" />}
              >
                PDF Manifest
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleDownload('csv')}
                leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-[#38BDF8]" />}
              >
                CSV Export
              </Button>

              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCloseModal(true)}
                leftIcon={<PowerOff className="w-3.5 h-3.5" />}
              >
                Terminate Session
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Session Close */}
      <Modal
        isOpen={showCloseModal}
        onClose={() => setShowCloseModal(false)}
        title="Hardware Session Termination Confirmation"
      >
        <div className="space-y-4 font-mono text-xs text-[#CBD5E1]">
          <p>
            You are about to terminate the active hardware ingress session for section{' '}
            <strong className="text-[#CCFF00]">{session?.sectionCode || sectionCode}</strong> on terminal{' '}
            <strong className="text-[#F1F5F9]">{terminalId}</strong>.
          </p>

          <div className="bg-[#1C1111] border border-[#4A1818] p-3 text-[11px] text-[#F87171] space-y-1">
            <div className="font-bold flex items-center gap-1.5 uppercase">
              <Lock className="w-3.5 h-3.5" />
              <span>Automated Roster Ledger Compilation</span>
            </div>
            <p>
              1. All unrecorded students in the manifest will automatically transition to{' '}
              <strong>ABSENT</strong> status.
            </p>
            <p>
              2. System will compile official PDF &amp; CSV attendance reports and dispatch them to the
              instructor's registered email via Nodemailer.
            </p>
            <p>
              3. Terminal [{terminalId}] will return to hardware state <strong>LOCKED</strong>.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E2632]">
            <Button variant="ghost" size="sm" onClick={() => setShowCloseModal(false)}>
              Abort
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmClose}
              isLoading={isClosing}
              leftIcon={<PowerOff className="w-3.5 h-3.5" />}
            >
              Confirm Termination
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SessionHeader;
