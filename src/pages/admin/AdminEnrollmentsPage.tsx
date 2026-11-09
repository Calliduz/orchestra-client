import React, { useState, useEffect } from 'react';
import { UserPlus, BookOpen, Users, Search, Trash2, CheckCircle2, AlertCircle, RefreshCw, X, ShieldCheck } from 'lucide-react';
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

  // Available students for enrollment
  const [availableStudents, setAvailableStudents] = useState<AvailableStudent[]>([]);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchSections();
  }, []);

  useEffect(() => {
    if (selectedSectionId) {
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
    setSelectedStudentToEnroll('');
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
        if (unenrolled.length > 0) {
          setSelectedStudentToEnroll(unenrolled[0].id);
        }
      }
      setIsEnrollModalOpen(true);
    } catch (err) {
      console.error('Failed to fetch students:', err);
    }
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentToEnroll || !selectedSectionId) return;

    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_V1_URL}/enrollments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          studentId: selectedStudentToEnroll,
          sectionId: selectedSectionId,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to enroll student');
      }

      setIsEnrollModalOpen(false);
      fetchRoster(selectedSectionId);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnenroll = async (studentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this section?`)) return;

    try {
      const res = await fetch(`${API_V1_URL}/enrollments/${studentId}/${selectedSectionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to unenroll student');
      }

      fetchRoster(selectedSectionId);
    } catch (err: any) {
      alert(err.message);
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
            <span>Enroll Student</span>
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
              <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">Selected Classroom Section</label>
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

      {/* Roster Search & Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden">
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
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No students currently enrolled in this section
                  </td>
                </tr>
              ) : (
                filteredRoster.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition">
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
                        onClick={() => handleUnenroll(item.student.id, `${item.student.firstName} ${item.student.lastName}`)}
                        className="px-2.5 py-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg border border-rose-500/20 transition text-xs inline-flex items-center gap-1.5"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Unenroll</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enroll Student Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title="Enroll Student into Section">
        <form onSubmit={handleEnrollSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {modalError}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Target Section</label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-white/[0.06] text-xs text-purple-300 font-mono">
              {activeSection?.sectionCode} &bull; {activeSection?.courseName}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Select Student to Enroll *</label>
            {availableStudents.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 bg-slate-950 rounded-xl border border-white/[0.05]">
                All registered students in the system are already enrolled in this section.
              </p>
            ) : (
              <select
                required
                value={selectedStudentToEnroll}
                onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              >
                {availableStudents.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.lastName}, {s.firstName} ({s.studentId || 'No ID'} &bull; {s.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEnrollModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting || availableStudents.length === 0}
            >
              {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

