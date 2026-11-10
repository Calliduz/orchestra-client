import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  BookOpen,
  Users,
  Search,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  CheckSquare,
  Square,
  UserMinus,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';

interface SectionOption {
  id: string;
  sectionCode: string;
  courseName: string;
  roomNumber: string;
  faculty: {
    firstName: string;
    lastName: string;
  };
}

interface EnrolledStudentItem {
  id: string;
  studentId: string;
  sectionId: string;
  enrolledAt: string;
  student: {
    id: string;
    studentId: string | null;
    firstName: string;
    lastName: string;
    email: string;
    rfidUid: string | null;
    department: string | null;
  };
}

interface AvailableStudent {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  rfidUid: string | null;
}

export const AdminEnrollmentsPage: React.FC = () => {
  const { token } = useAuth();
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [roster, setRoster] = useState<EnrolledStudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Mass Selection in Roster
  const [selectedRosterIds, setSelectedRosterIds] = useState<Set<string>>(new Set());

  // Available students for enrollment
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [selectedEnrollIds, setSelectedEnrollIds] = useState<Set<string>>(new Set());
  const [enrollModalSearch, setEnrollModalSearch] = useState('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Single Unenroll Modal
  const [unenrollTarget, setUnenrollTarget] = useState<EnrolledStudentItem | null>(null);
  const [isUnenrolling, setIsUnenrolling] = useState(false);

  // Mass Unenroll Modal
  const [isMassUnenrollModalOpen, setIsMassUnenrollModalOpen] = useState(false);
  const [isMassUnenrolling, setIsMassUnenrolling] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
      setSelectedRosterIds(new Set());
      fetchRoster(selectedSectionId);
    }
  }, [selectedSectionId]);

  const fetchSections = async () => {
    try {
      const res = await fetch(`${API_V1_URL}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success && json.data.length > 0) {
        setSections(json.data);
        setSelectedSectionId(json.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    }
  };

  const fetchRoster = async (sectionId: string) => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_V1_URL}/enrollments/section/${sectionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setRoster(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch roster:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openEnrollModal = async () => {
    setModalError(null);
    setEnrollModalSearch('');
    setSelectedEnrollIds(new Set());
    try {
      // Fetch all students to see who is not yet enrolled
      const res = await fetch(`${API_V1_URL}/users?role=STUDENT`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const enrolledSet = new Set(roster.map((r) => r.student.id));
        const unenrolled = json.data.filter((s: AvailableStudent) => !enrolledSet.has(s.id));
        setAvailableStudents(unenrolled);
      }
      setIsEnrollModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  // Mass Enrollment Submit
  const handleBulkEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEnrollIds.size === 0 || !selectedSectionId) return;

    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_V1_URL}/enrollments/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedEnrollIds),
          sectionId: selectedSectionId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to bulk enroll students');
      }

      setIsEnrollModalOpen(false);
      setSelectedEnrollIds(new Set());
      fetchRoster(selectedSectionId);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single Unenroll Confirm
  const handleConfirmSingleUnenroll = async () => {
    if (!unenrollTarget || !selectedSectionId) return;
    setIsUnenrolling(true);
    try {
      const res = await fetch(`${API_V1_URL}/enrollments/${unenrollTarget.student.id}/${selectedSectionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to unenroll student');
      }

      setUnenrollTarget(null);
      // Remove from selection if present
      setSelectedRosterIds((prev) => {
        const next = new Set(prev);
        next.delete(unenrollTarget.student.id);
        return next;
      });
      fetchRoster(selectedSectionId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUnenrolling(false);
    }
  };

  // Mass Unenroll Confirm
  const handleConfirmMassUnenroll = async () => {
    if (selectedRosterIds.size === 0 || !selectedSectionId) return;
    setIsMassUnenrolling(true);
    try {
      const res = await fetch(`${API_V1_URL}/enrollments/bulk-unenroll`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentIds: Array.from(selectedRosterIds),
          sectionId: selectedSectionId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to mass unenroll students');
      }

      setIsMassUnenrollModalOpen(false);
      setSelectedRosterIds(new Set());
      fetchRoster(selectedSectionId);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsMassUnenrolling(false);
    }
  };

  const activeSection = sections.find((s) => s.id === selectedSectionId);

  const filteredRoster = roster.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.student.firstName.toLowerCase().includes(q) ||
      r.student.lastName.toLowerCase().includes(q) ||
      (r.student.studentId && r.student.studentId.toLowerCase().includes(q)) ||
      r.student.email.toLowerCase().includes(q) ||
      (r.student.rfidUid && r.student.rfidUid.toLowerCase().includes(q))
    );
  });

  // Toggle selection for single roster item
  const toggleRosterSelect = (studentId: string) => {
    setSelectedRosterIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Toggle select all filtered roster items
  const toggleSelectAllRoster = () => {
    if (selectedRosterIds.size === filteredRoster.length && filteredRoster.length > 0) {
      setSelectedRosterIds(new Set());
    } else {
      setSelectedRosterIds(new Set(filteredRoster.map((r) => r.student.id)));
    }
  };

  // Filter available students for enrollment modal
  const filteredAvailableStudents = availableStudents.filter((s) => {
    const q = enrollModalSearch.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      (s.studentId && s.studentId.toLowerCase().includes(q)) ||
      s.email.toLowerCase().includes(q)
    );
  });

  const toggleEnrollSelect = (studentId: string) => {
    setSelectedEnrollIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const toggleSelectAllAvailable = () => {
    if (selectedEnrollIds.size === filteredAvailableStudents.length && filteredAvailableStudents.length > 0) {
      setSelectedEnrollIds(new Set());
    } else {
      setSelectedEnrollIds(new Set(filteredAvailableStudents.map((s) => s.id)));
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-purple-400" />
            <span>Course Section Enrollments</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage student rosters per classroom. Only students enrolled here can tap in to check attendance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchRoster(selectedSectionId)}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Roster</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openEnrollModal}
            disabled={!selectedSectionId}
            className="gap-2 bg-purple-600 hover:bg-purple-500"
          >
            <UserPlus className="w-4 h-4" />
            <span>Enroll Students</span>
          </Button>
        </div>
      </div>

      {/* Section Selector Card */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                Selected Classroom Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs text-white font-medium focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              >
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sectionCode} - {s.courseName} (Prof. {s.faculty.lastName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div>
              <span className="text-slate-500">ROOM: </span>
              <span className="text-slate-200 font-bold">{activeSection?.roomNumber || '—'}</span>
            </div>
            <div>
              <span className="text-slate-500">ROSTER COUNT: </span>
              <span className="text-purple-400 font-bold">{roster.length} Enrolled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Roster Search & Mass Action Bar */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden">
        {/* Mass Selection Ribbon if 1+ items selected */}
        {selectedRosterIds.size > 0 && (
          <div className="p-3 bg-purple-950/40 border-b border-purple-500/30 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-mono text-purple-300 font-bold">
                {selectedRosterIds.size} student{selectedRosterIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRosterIds(new Set())}
                className="text-[11px] py-1 h-7 border-white/[0.08]"
              >
                Deselect All
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsMassUnenrollModalOpen(true)}
                className="text-[11px] py-1 h-7 gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Mass Unenroll ({selectedRosterIds.size})</span>
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search enrolled students..."
              className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Showing {filteredRoster.length} of {roster.length} students
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01] text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRoster.length > 0 && selectedRosterIds.size === filteredRoster.length}
                    onChange={toggleSelectAllRoster}
                    className="w-3.5 h-3.5 rounded border-white/[0.2] bg-slate-950 text-purple-600 focus:ring-purple-500/40 cursor-pointer"
                    title="Select / Deselect All"
                  />
                </th>
                <th className="py-3 px-4 font-medium">#</th>
                <th className="py-3 px-4 font-medium">Student Name & Email</th>
                <th className="py-3 px-4 font-medium">Student ID</th>
                <th className="py-3 px-4 font-medium">RFID UID Credential</th>
                <th className="py-3 px-4 font-medium">Enrolled Date</th>
                <th className="py-3 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No students currently enrolled in this section
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item, idx) => {
                  const isSelected = selectedRosterIds.has(item.student.id);
                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-white/[0.02] transition ${
                        isSelected ? 'bg-purple-500/[0.06]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRosterSelect(item.student.id)}
                          className="w-3.5 h-3.5 rounded border-white/[0.2] bg-slate-950 text-purple-600 focus:ring-purple-500/40 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500 align-middle">{idx + 1}</td>
                      <td className="py-3 px-4 align-middle">
                        <div className="font-medium text-slate-200">
                          {item.student.lastName}, {item.student.firstName}
                        </div>
                        <div className="text-[11px] text-slate-400">{item.student.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 align-middle">
                        {item.student.studentId || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 font-mono align-middle">
                        {item.student.rfidUid ? (
                          <span className="text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[11px]">
                            0x{item.student.rfidUid}
                          </span>
                        ) : (
                          <span className="text-slate-600 italic">No Badge</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] align-middle">
                        {new Date(item.enrolledAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right align-middle">
                        <button
                          onClick={() => setUnenrollTarget(item)}
                          className="px-2.5 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition text-xs inline-flex items-center gap-1.5"
                          title="Unenroll student"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Unenroll</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mass Enrollment Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Mass Enroll Students into Section"
        hideFooter
      >
        <form onSubmit={handleBulkEnrollSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Section</label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-xs text-purple-300 font-mono">
              {activeSection?.sectionCode} &bull; {activeSection?.courseName} ({activeSection?.roomNumber})
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300">
                Select Students to Enroll *
              </label>
              {filteredAvailableStudents.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllAvailable}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-medium font-mono"
                >
                  {selectedEnrollIds.size === filteredAvailableStudents.length
                    ? 'Deselect All'
                    : `Select All Available (${filteredAvailableStudents.length})`}
                </button>
              )}
            </div>

            {/* Filter Search inside Modal */}
            <div className="relative mb-2">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by student name, ID, email..."
                value={enrollModalSearch}
                onChange={(e) => setEnrollModalSearch(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>

            {availableStudents.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl border border-white/[0.05] text-center">
                All registered students in the institution are already enrolled in this section.
              </p>
            ) : filteredAvailableStudents.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-4 bg-slate-950 rounded-xl border border-white/[0.05] text-center">
                No unenrolled students match your search filter.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-1.5 p-1 bg-slate-950/60 rounded-xl border border-white/[0.06]">
                {filteredAvailableStudents.map((s) => {
                  const isChecked = selectedEnrollIds.has(s.id);
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleEnrollSelect(s.id)}
                      className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition ${
                        isChecked
                          ? 'bg-purple-950/40 border-purple-500/40 text-white'
                          : 'bg-slate-900/60 border-white/[0.04] text-slate-300 hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded border-white/[0.2] bg-slate-950 text-purple-600 focus:ring-purple-500/40 pointer-events-none"
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-xs truncate">
                            {s.lastName}, {s.firstName}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">
                            {s.studentId || 'No ID'} &bull; {s.email}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-[10px] font-mono">
                        {s.rfidUid ? (
                          <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Badge
                          </span>
                        ) : (
                          <span className="text-slate-600">No Badge</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <span className="text-xs font-mono text-purple-400 font-bold">
              {selectedEnrollIds.size} student{selectedEnrollIds.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || selectedEnrollIds.size === 0}
                className="bg-purple-600 hover:bg-purple-500"
              >
                {isSubmitting
                  ? 'Enrolling...'
                  : `Confirm Enrollment (${selectedEnrollIds.size})`}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Single Unenroll Confirmation Modal */}
      {unenrollTarget && (
        <Modal
          isOpen={true}
          onClose={() => setUnenrollTarget(null)}
          title="Unenroll Student from Section"
          hideFooter
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-300 space-y-1">
                <div className="font-bold">Are you sure you want to unenroll this student?</div>
                <div className="text-slate-300">
                  <strong className="text-white">
                    {unenrollTarget.student.firstName} {unenrollTarget.student.lastName}
                  </strong>{' '}
                  ({unenrollTarget.student.studentId || 'No ID'}) will be removed from{' '}
                  <strong className="text-purple-300">{activeSection?.sectionCode}</strong>.
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  They will no longer be permitted to check in or tap attendance for this course section.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setUnenrollTarget(null)}
                disabled={isUnenrolling}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmSingleUnenroll}
                disabled={isUnenrolling}
              >
                {isUnenrolling ? 'Unenrolling...' : 'Confirm Unenroll'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Mass Unenroll Confirmation Modal */}
      {isMassUnenrollModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsMassUnenrollModalOpen(false)}
          title="Mass Unenroll Students"
          hideFooter
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-300 space-y-1">
                <div className="font-bold">
                  Confirm Mass Unenrollment ({selectedRosterIds.size} Students)
                </div>
                <div className="text-slate-300">
                  You are about to remove <strong>{selectedRosterIds.size}</strong> selected students from{' '}
                  <strong className="text-purple-300">{activeSection?.sectionCode}</strong>.
                </div>
                <div className="text-[11px] text-slate-400 pt-1">
                  Their enrollment records for this section will be deleted, preventing doorway ingress.
                </div>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 p-2 bg-slate-950 rounded-xl border border-white/[0.06] text-xs">
              {roster
                .filter((r) => selectedRosterIds.has(r.student.id))
                .map((r) => (
                  <div key={r.id} className="py-1 px-2 text-slate-300 flex items-center justify-between border-b border-white/[0.03] last:border-0">
                    <span className="font-medium text-white">
                      {r.student.lastName}, {r.student.firstName}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {r.student.studentId || r.student.email}
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/[0.06]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMassUnenrollModalOpen(false)}
                disabled={isMassUnenrolling}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={handleConfirmMassUnenroll}
                disabled={isMassUnenrolling}
              >
                {isMassUnenrolling
                  ? 'Unenrolling...'
                  : `Confirm Mass Unenroll (${selectedRosterIds.size})`}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminEnrollmentsPage;
