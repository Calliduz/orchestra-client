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
  Check,
} from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

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

const CustomCheckbox: React.FC<{
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  title?: string;
}> = ({ checked, indeterminate, onChange, title }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    title={title}
    className={`w-4 h-4 rounded border flex items-center justify-center transition-all duration-150 focus:outline-none shrink-0 ${
      checked
        ? 'bg-purple-600 border-purple-500 text-white shadow-xs shadow-purple-600/30'
        : indeterminate
        ? 'bg-purple-950/60 border-purple-400 text-purple-300'
        : 'bg-slate-950/80 border-white/20 hover:border-white/40 text-transparent'
    }`}
  >
    {checked ? (
      <Check className="w-3 h-3 stroke-[3]" />
    ) : indeterminate ? (
      <span className="w-2 h-0.5 bg-purple-300 rounded-full" />
    ) : null}
  </button>
);

export const AdminEnrollmentsPage: React.FC = () => {
  const { token } = useAuth();
  const { toast } = useToast();
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

      const enrolledCount = selectedEnrollIds.size;
      setIsEnrollModalOpen(false);
      setSelectedEnrollIds(new Set());
      fetchRoster(selectedSectionId);
      toast.success('Enrollment Complete', `Successfully enrolled ${enrolledCount} student(s) into ${activeSection?.sectionCode || 'section'}.`);
    } catch (err: any) {
      setModalError(err.message);
      toast.error('Enrollment Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Single Unenroll Confirm
  const handleConfirmSingleUnenroll = async () => {
    if (!unenrollTarget || !selectedSectionId) return;
    setIsUnenrolling(true);
    const targetStudentName = `${unenrollTarget.student.firstName} ${unenrollTarget.student.lastName}`;
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
      toast.success('Student Unenrolled', `${targetStudentName} removed from ${activeSection?.sectionCode || 'section'}.`);
    } catch (err: any) {
      toast.error('Unenroll Failed', err.message);
    } finally {
      setIsUnenrolling(false);
    }
  };

  // Mass Unenroll Confirm
  const handleConfirmMassUnenroll = async () => {
    if (selectedRosterIds.size === 0 || !selectedSectionId) return;
    setIsMassUnenrolling(true);
    const removedCount = selectedRosterIds.size;
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
      toast.success('Mass Unenroll Complete', `Removed ${removedCount} student(s) from ${activeSection?.sectionCode || 'section'}.`);
    } catch (err: any) {
      toast.error('Mass Unenroll Failed', err.message);
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
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchRoster(selectedSectionId);
              toast.info('Roster Synced', `Roster updated for ${activeSection?.sectionCode || 'section'}.`);
            }}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="h-9 px-3.5 border-white/[0.08] hover:border-white/[0.15]"
          >
            Refresh Roster
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openEnrollModal}
            disabled={!selectedSectionId}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            className="h-9 px-3.5 bg-purple-600 hover:bg-purple-500 border border-purple-400/30 shadow-md shadow-purple-600/20"
          >
            Enroll Students
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
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
        {/* Mass Selection Ribbon if 1+ items selected */}
        {selectedRosterIds.size > 0 && (
          <div className="p-3 bg-gradient-to-r from-purple-950/60 via-slate-900/80 to-purple-950/60 border-b border-purple-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="font-mono text-purple-300 font-bold">
                {selectedRosterIds.size} of {roster.length} student{selectedRosterIds.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedRosterIds(new Set())}
                className="text-[11px] py-1 h-7 border-white/[0.08] hover:border-white/20"
              >
                Deselect All
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsMassUnenrollModalOpen(true)}
                leftIcon={<UserMinus className="w-3.5 h-3.5" />}
                className="text-[11px] py-1 h-7"
              >
                Mass Unenroll ({selectedRosterIds.size})
              </Button>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-white/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 w-full sm:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search enrolled students..."
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
            <button
              type="button"
              onClick={toggleSelectAllRoster}
              className={`text-xs px-2.5 py-1.5 h-8 rounded-xl border flex items-center gap-1.5 transition font-mono text-[11px] shrink-0 ${
                selectedRosterIds.size === filteredRoster.length && filteredRoster.length > 0
                  ? 'bg-purple-600/20 text-purple-300 border-purple-500/40'
                  : 'bg-slate-950 border-white/[0.08] hover:border-white/20 text-slate-300 hover:text-white'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
              <span>
                {selectedRosterIds.size === filteredRoster.length && filteredRoster.length > 0
                  ? 'Deselect All'
                  : `Select All (${filteredRoster.length})`}
              </span>
            </button>
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
                  <CustomCheckbox
                    checked={filteredRoster.length > 0 && selectedRosterIds.size === filteredRoster.length}
                    indeterminate={selectedRosterIds.size > 0 && selectedRosterIds.size < filteredRoster.length}
                    onChange={toggleSelectAllRoster}
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
                      onClick={() => toggleRosterSelect(item.student.id)}
                      className={`hover:bg-white/[0.02] cursor-pointer transition select-none ${
                        isSelected ? 'bg-purple-500/[0.08]' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        <CustomCheckbox
                          checked={isSelected}
                          onChange={() => toggleRosterSelect(item.student.id)}
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
                      <td className="py-3 px-4 text-right align-middle" onClick={(e) => e.stopPropagation()}>
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

      {/* Mass Enrollment Modal - Redesigned Cyber-Slate UI */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Mass Enroll Students into Section"
        hideFooter
      >
        <form onSubmit={handleBulkEnrollSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Section Target Header Pill */}
          <div className="p-3 rounded-xl bg-slate-950 border border-white/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {activeSection?.sectionCode} &bull; {activeSection?.courseName}
                </div>
                <div className="text-[11px] text-slate-400 font-mono truncate">
                  Room {activeSection?.roomNumber} &bull; Prof. {activeSection?.faculty.lastName}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 shrink-0">
              Target
            </span>
          </div>

          <div>
            {/* Toolbar: Counter and Quick Select/Deselect Pills */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-300">Select Students</span>
                <span className="text-[11px] font-mono text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {selectedEnrollIds.size} / {filteredAvailableStudents.length} selected
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={toggleSelectAllAvailable}
                  className="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-purple-600/20 text-slate-300 hover:text-purple-300 border border-white/[0.06] hover:border-purple-500/30 transition flex items-center gap-1"
                >
                  <CheckSquare className="w-3 h-3 text-purple-400" />
                  <span>
                    {selectedEnrollIds.size === filteredAvailableStudents.length && filteredAvailableStudents.length > 0
                      ? 'Deselect All'
                      : `Select All (${filteredAvailableStudents.length})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Filter Search inside Modal */}
            <div className="relative mb-2.5">
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
              <p className="text-xs text-slate-500 italic p-6 bg-slate-950 rounded-xl border border-white/[0.05] text-center">
                All registered students in the institution are already enrolled in this section.
              </p>
            ) : filteredAvailableStudents.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-6 bg-slate-950 rounded-xl border border-white/[0.05] text-center">
                No unenrolled students match your search filter.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-white/[0.04] bg-slate-950/80 rounded-xl border border-white/[0.06]">
                {filteredAvailableStudents.map((s) => {
                  const isChecked = selectedEnrollIds.has(s.id);
                  const initials = `${s.firstName.charAt(0)}${s.lastName.charAt(0)}`.toUpperCase();
                  return (
                    <div
                      key={s.id}
                      onClick={() => toggleEnrollSelect(s.id)}
                      className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-purple-600/10 text-white'
                          : 'hover:bg-white/[0.03] text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <CustomCheckbox
                          checked={isChecked}
                          onChange={() => toggleEnrollSelect(s.id)}
                        />
                        <div className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] text-slate-300 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {s.lastName}, {s.firstName}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono truncate flex items-center gap-1.5">
                            <span>{s.studentId || 'No ID'}</span>
                            <span className="text-slate-600">&bull;</span>
                            <span className="text-slate-500">{s.email}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 pl-2">
                        {s.rfidUid ? (
                          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                            <span>0x{s.rfidUid}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-500 bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded-full">
                            No Tag
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <span className="text-xs font-mono text-purple-300 font-medium">
              {selectedEnrollIds.size} student{selectedEnrollIds.size === 1 ? '' : 's'} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEnrollModalOpen(false)}
                className="h-9 px-3.5"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || selectedEnrollIds.size === 0}
                className="h-9 px-3.5 bg-purple-600 hover:bg-purple-500 border border-purple-400/30 shadow-md shadow-purple-600/20"
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
