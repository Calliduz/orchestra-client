import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Download, Mail, Filter, Calendar, RefreshCw, CheckCircle2, AlertCircle, FileSpreadsheet, Send, X } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';

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
  _count: {
    attendanceLogs: number;
  };
}

interface SectionOption {
  id: string;
  sectionCode: string;
}

export const FacultyReportsPage: React.FC = () => {
  const { user, token } = useAuth();
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
  const downloadReport = (sessionId: string, format: 'pdf' | 'csv' | 'xlsx') => {
    window.open(`${API_V1_URL}/sessions/${sessionId}/export/${format}`, '_blank');
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
      setTimeout(() => {
        setIsEmailModalOpen(false);
      }, 1500);
    } catch (err: any) {
      setEmailStatusMsg({ type: 'error', text: err.message });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-400" />
            <span>Attendance Reports & Archives</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Export official PDF, Excel (.xlsx), and CSV attendance rosters, filter by date, or dispatch via email.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSessions} disabled={isLoading} className="gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
        </Button>
      </div>

      {/* Date & Section Filter Card */}
      <Card className="p-4">
        <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono text-slate-400 mb-1">Classroom Section</label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
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
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
            >
              <option value="">All Statuses</option>
              <option value="CLOSED">Closed & Finalized</option>
              <option value="OPEN">Live / Active</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" variant="primary" className="flex-1 gap-1.5 bg-blue-600 hover:bg-blue-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Apply</span>
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </form>
      </Card>

      {/* Reports Table */}
      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="font-mono text-slate-400">
            Total Matched Sessions: <strong className="text-white">{sessions.length}</strong>
          </div>
          <div className="text-[11px] text-slate-400">
            * All times formatted in standard 12-hour AM/PM format
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4">Date & 12-Hour Time</th>
                <th className="py-3 px-4">Course & Section</th>
                <th className="py-3 px-4">Room & Terminal</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Tally</th>
                <th className="py-3 px-4 text-right">Export & Dispatch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No sessions found matching current filter parameters
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const startTime12H = format12HourTime(sess.startTime);
                  const endTime12H = format12HourTime(sess.endTime);
                  const isClosed = sess.status === 'CLOSED';

                  return (
                    <tr key={sess.id} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">
                          {formatSessionDate(sess.startTime)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {startTime12H} &ndash; {endTime12H}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-bold text-blue-400">
                          {sess.section.sectionCode}
                        </span>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">
                          {sess.section.courseName}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <div>{sess.section.roomNumber}</div>
                        <div className="text-[10px] text-slate-500">{sess.terminalId}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded font-semibold border ${
                            sess.status === 'CLOSED'
                              ? 'bg-slate-800 text-slate-300 border-slate-700'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                          }`}
                        >
                          {sess.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-slate-300">
                        <span className="font-bold text-white">{sess._count.attendanceLogs}</span>{' '}
                        <span className="text-slate-500 text-[11px]">Logged</span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Excel Export Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'xlsx')}
                            className="p-1.5 hover:bg-emerald-500/10 text-emerald-400 hover:text-emerald-300 border border-emerald-500/20 rounded transition flex items-center gap-1 text-[11px] font-mono"
                            title="Download Excel Spreadsheet (.xlsx)"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>XLSX</span>
                          </button>

                          {/* PDF Export Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'pdf')}
                            className="p-1.5 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 border border-rose-500/20 rounded transition flex items-center gap-1 text-[11px] font-mono"
                            title="Download Official PDF Master Report"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>PDF</span>
                          </button>

                          {/* CSV Export Button */}
                          <button
                            onClick={() => downloadReport(sess.id, 'csv')}
                            className="p-1.5 hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 border border-blue-500/20 rounded transition flex items-center gap-1 text-[11px] font-mono"
                            title="Download Raw CSV"
                          >
                            <span>CSV</span>
                          </button>

                          {/* Email Report Button */}
                          <button
                            onClick={() => openEmailModal(sess.id)}
                            className="p-1.5 hover:bg-purple-500/10 text-purple-400 hover:text-purple-300 border border-purple-500/20 rounded transition flex items-center gap-1 text-[11px] font-mono"
                            title="Send Report via Email"
                          >
                            <Mail className="w-3.5 h-3.5" />
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
      </Card>

      {/* Email Report Modal */}
      <Modal isOpen={isEmailModalOpen} onClose={() => setIsEmailModalOpen(false)} title="Dispatch Attendance Report via Email">
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
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEmailModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSendingEmail}
              className="gap-2 bg-purple-600 hover:bg-purple-500"
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

