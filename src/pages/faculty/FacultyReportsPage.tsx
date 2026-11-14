import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Mail,
  Filter,
  Calendar,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Send,
  X,
  Layers,
  Clock,
  Sparkles,
  GraduationCap,
  Building2,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface SessionReportItem {
  id: string;
  sectionId: string;
  terminalId: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  startTime: string;
  endTime: string | null;
  lateThresholdMins: number;
  cutThresholdMins: number;
  reportSentAt: string | null;
  section: {
    sectionCode: string;
    courseName: string;
    roomNumber: string;
  };
  _count?: {
    attendanceLogs: number;
  };
  attendanceLogs?: any[];
}

interface SectionOption {
  id: string;
  sectionCode: string;
}

export const FacultyReportsPage: React.FC = () => {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const [sessions, setSessions] = useState<SessionReportItem[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(searchParams.get('sectionId') || '');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Email modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailSessionId, setEmailSessionId] = useState<string | null>(null);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatusMsg, setEmailStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [selectedSectionId, statusFilter]);

  const fetchSections = async () => {
    try {
      const res = await fetch(`${API_V1_URL}/sections/my`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSections(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    }
  };

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const url = new URL(`${API_V1_URL}/sessions/my`);
      if (selectedSectionId) url.searchParams.set('sectionId', selectedSectionId);
      if (statusFilter) url.searchParams.set('status', statusFilter);
      if (fromDate) url.searchParams.set('from', new Date(fromDate).toISOString());
      if (toDate) url.searchParams.set('to', new Date(toDate + 'T23:59:59').toISOString());

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSessions(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions();
  };

  const resetFilters = () => {
    setFromDate('');
    setToDate('');
    setSelectedSectionId('');
    setStatusFilter('');
    setTimeout(() => fetchSessions(), 50);
  };

  // Helper for 12-hour AM/PM formatting
  const format12HourTime = (dateStr: string | null) => {
    if (!dateStr) return 'Ongoing';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatSessionDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Downloads
  const downloadReport = async (sessionId: string, format: 'pdf' | 'csv' | 'xlsx' | 'canvas' | 'moodle' | 'institutional-pdf') => {
    const labels: Record<string, string> = {
      pdf: 'PDF Master Roster',
      csv: 'Standard CSV',
      xlsx: 'Excel Spreadsheet',
      canvas: 'Canvas SIS Gradebook CSV',
      moodle: 'Moodle Attendance CSV',
      'institutional-pdf': 'Formal Institutional Master PDF',
    };
    toast.info('Export Initiated', `Generating ${labels[format] || format.toUpperCase()}...`);
    try {
      const res = await fetch(`${API_V1_URL}/sessions/${sessionId}/export/${format}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Export failed with HTTP ${res.status}`);
      }

      const blob = await res.blob();
      const ext = format === 'xlsx' ? 'xlsx' : format.includes('pdf') ? 'pdf' : 'csv';
      const disposition = res.headers.get('Content-Disposition');
      let filename = `ORCHESTRA_${format.toUpperCase()}_${sessionId.slice(0, 8)}.${ext}`;
      if (disposition && disposition.includes('filename=')) {
        const match = disposition.match(/filename=(?:["']?)([^"';]+)(?:["']?)/);
        if (match && match[1]) filename = match[1];
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Download Complete', `Exported ${labels[format] || format.toUpperCase()}`);
    } catch (err: any) {
      console.error('Export download error:', err);
      toast.error('Export Failed', err.message);
    }
  };

  const openEmailModal = (sessionId: string) => {
    setEmailSessionId(sessionId);
    setRecipientEmail(user?.email || '');
    setEmailStatusMsg(null);
    setIsEmailModalOpen(true);
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailSessionId) return;

    setIsSendingEmail(true);
    setEmailStatusMsg(null);

    try {
      const res = await fetch(`${API_V1_URL}/sessions/${emailSessionId}/email-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ recipientEmail }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to dispatch email');
      }

      setEmailStatusMsg({
        type: 'success',
        text: `Attendance report successfully sent to ${recipientEmail}!`,
      });
      toast.success('Report Dispatched', `Attendance audit email sent to ${recipientEmail}.`);
      setTimeout(() => {
        setIsEmailModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setEmailStatusMsg({ type: 'error', text: err.message });
      toast.error('Dispatch Failed', err.message);
    } finally {
      setIsSendingEmail(false);
    }
  };

  const totalLogsCount = sessions.reduce((acc, s) => acc + (s._count?.attendanceLogs || 0), 0);
  const closedCount = sessions.filter((s) => s.status === 'CLOSED').length;
  const liveCount = sessions.filter((s) => s.status === 'OPEN').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <span>Attendance Reports &amp; Archives</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export official PDF, Excel (.xlsx), and CSV attendance rosters, filter by date, or dispatch via email.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            fetchSessions();
            toast.info('Reports Refreshed', 'Session audit archives synchronized.');
          }}
          disabled={isLoading}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
          className="h-9 px-3.5 border-white/[0.08] hover:bg-white/[0.04]"
        >
          Refresh Reports
        </Button>
      </div>

      {/* Quick Summary Metrics Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Matched Sessions</div>
          <div className="text-2xl font-extrabold text-white font-mono mt-1">{sessions.length}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Filter results</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Total Verified Taps</div>
          <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">{totalLogsCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Ingress entries</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Closed &amp; Finalized</div>
          <div className="text-2xl font-extrabold text-sky-400 font-mono mt-1">{closedCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Archived manifests</div>
        </div>
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
          <div className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Live / Ongoing</div>
          <div className="text-2xl font-extrabold text-amber-400 font-mono mt-1">{liveCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Currently active</div>
        </div>
      </div>

      {/* Date & Section Filter Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Classroom Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All My Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sectionCode}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Session Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950/70 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="">All Statuses</option>
              <option value="CLOSED">Closed &amp; Finalized</option>
              <option value="OPEN">Live / Active</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-500 shadow-sm shadow-blue-500/20"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Apply</span>
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={resetFilters}
              className="border-white/[0.08] hover:bg-white/[0.04]"
            >
              Reset
            </Button>
          </div>
        </form>
      </div>

      {/* Reports Table Card */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-white/[0.05] flex items-center justify-between text-xs">
          <div className="font-mono text-slate-400">
            Total Matched Sessions: <strong className="text-white">{sessions.length}</strong>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            * All times formatted in standard 12-hour AM/PM format
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.05] bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Date &amp; 12-Hour Time</th>
                <th className="py-3 px-4">Course &amp; Section</th>
                <th className="py-3 px-4">Room &amp; Terminal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tally</th>
                <th className="py-3 px-4 text-right">Export &amp; Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No sessions found matching current filter parameters
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const startTime12H = format12HourTime(sess.startTime);
                  const endTime12H = format12HourTime(sess.endTime);

                  return (
                    <tr key={sess.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">
                          {formatSessionDate(sess.startTime)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {startTime12H} &ndash; {endTime12H}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-blue-400 px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                          {sess.section.sectionCode}
                        </span>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs mt-1">
                          {sess.section.courseName}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <div className="font-medium text-white">{sess.section.roomNumber}</div>
                        <div className="text-[10px] text-slate-500">{sess.terminalId}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            sess.status === 'CLOSED'
                              ? 'bg-slate-800 text-slate-300 border-white/[0.08]'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              sess.status === 'CLOSED' ? 'bg-slate-400' : 'bg-emerald-400'
                            }`}
                          />
                          {sess.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <span className="font-bold text-white text-sm">{sess._count?.attendanceLogs ?? sess.attendanceLogs?.length ?? 0}</span>{' '}
                        <span className="text-slate-500 text-[11px]">Logged</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex flex-wrap items-center gap-1 justify-end p-1 rounded-xl bg-slate-950/70 border border-white/[0.08] shadow-xs">
                          {/* Institutional Master PDF Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'institutional-pdf')}
                            className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Download Formal Institutional Master PDF with University Header & Signatures"
                          >
                            <Building2 className="w-3 h-3 text-indigo-400" />
                            <span>INSTITUTIONAL PDF</span>
                          </button>

                          {/* Canvas SIS CSV Export */}
                          <button
                            onClick={() => downloadReport(sess.id, 'canvas')}
                            className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Download Canvas SIS Gradebook CSV (Student ID, Name, Grade / 100)"
                          >
                            <GraduationCap className="w-3 h-3 text-amber-400" />
                            <span>CANVAS</span>
                          </button>

                          {/* Moodle Attendance Plugin CSV Export */}
                          <button
                            onClick={() => downloadReport(sess.id, 'moodle')}
                            className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/30 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Download Moodle Attendance Plugin CSV (P, L, E, A notation)"
                          >
                            <Layers className="w-3 h-3 text-orange-400" />
                            <span>MOODLE</span>
                          </button>

                          {/* Excel Export Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'xlsx')}
                            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Download Excel Spreadsheet (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                            <span>XLSX</span>
                          </button>

                          {/* PDF Export Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'pdf')}
                            className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Download Official PDF Master Report"
                          >
                            <FileText className="w-3 h-3 text-rose-400" />
                            <span>PDF</span>
                          </button>

                          {/* CSV Export Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'csv')}
                            className="px-2 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Download Raw CSV"
                          >
                            <Download className="w-3 h-3 text-sky-400" />
                            <span>CSV</span>
                          </button>

                          {/* Email Report Button */}
                          <button
                            onClick={() => openEmailModal(sess.id)}
                            className="px-2 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 transition-all text-[11px] font-mono font-medium flex items-center gap-1 active:scale-95"
                            title="Send Report via Email"
                          >
                            <Mail className="w-3 h-3 text-purple-400" />
                            <span>Email</span>
                          </button>
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

      {/* Email Report Modal */}
      <Modal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        title="Dispatch Attendance Report via Email"
      >
        <form onSubmit={handleSendEmail} className="space-y-4">
          <p className="text-xs text-slate-300">
            Send the finalized attendance roster with attached PDF, Excel (.xlsx), and CSV files to your institutional
            mailbox or a departmental proctor.
          </p>

          {emailStatusMsg && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                emailStatusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              {emailStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{emailStatusMsg.text}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Destination Email Address *</label>
            <input
              type="email"
              required
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              placeholder="faculty@qcu.edu.ph"
              className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEmailModalOpen(false)}
              className="border-white/[0.08]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSendingEmail}
              className="gap-2 bg-purple-600 hover:bg-purple-500 shadow-sm shadow-purple-500/20"
            >
              {isSendingEmail ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Report</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
