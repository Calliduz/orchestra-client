import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Edit2, Trash2, Clock, Users, RefreshCw,
  Search, ArrowRight, Calendar, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';

interface SectionItem {
  id: string;
  sectionCode: string;
  courseName: string;
  roomNumber: string;
  terminalId: string;
  facultyId: string;
  faculty: { id: string; firstName: string; lastName: string; email: string };
  defaultLateThresholdMins: number;
  defaultCutThresholdMins: number;
  scheduleDay: string | null;
  scheduleTime: string | null;
  _count: { enrollments: number; sessions: number };
}

interface FacultyOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const DAYS = [
  { value: 'MWF',  label: 'Mon / Wed / Fri' },
  { value: 'TTH',  label: 'Tue / Thu' },
  { value: 'SAT',  label: 'Saturday' },
  { value: 'SUN',  label: 'Sunday' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'MW',   label: 'Mon / Wed' },
  { value: 'TF',   label: 'Tue / Fri' },
];

const emptyForm = {
  sectionCode: '',
  courseName: '',
  roomNumber: 'LAB-304',
  terminalId: 'TERM-CL304',
  facultyId: '',
  // stored as strings while editing to avoid "resets to 45" bug
  lateStr: '15',
  cutStr: '45',
  scheduleDay: '',
  scheduleTime: '',
};

export const AdminSectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = sections.filter((sec) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      sec.sectionCode?.toLowerCase().includes(q) ||
      sec.courseName?.toLowerCase().includes(q) ||
      sec.faculty?.firstName?.toLowerCase().includes(q) ||
      sec.faculty?.lastName?.toLowerCase().includes(q) ||
      sec.roomNumber?.toLowerCase().includes(q) ||
      sec.terminalId?.toLowerCase().includes(q)
    );
  });

  // Modal visibility
  const [isAddModalOpen, setIsAddModalOpen]         = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]       = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen]   = useState(false);
  const [selectedSection, setSelectedSection]       = useState<SectionItem | null>(null);

  const [form, setForm]       = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSections();
    fetchFacultyList();
  }, []);

  const fetchSections = async () => {
    try {
      setIsLoading(true);
      const res  = await fetch(`${API_V1_URL}/sections`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setSections(json.data);
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFacultyList = async () => {
    try {
      const res  = await fetch(`${API_V1_URL}/users?role=FACULTY`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setFacultyList(json.data);
    } catch (err) {
      console.error('Failed to fetch faculty:', err);
    }
  };

  const openAddModal = () => {
    setForm({ ...emptyForm, facultyId: facultyList[0]?.id || '' });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (sec: SectionItem) => {
    setSelectedSection(sec);
    setForm({
      sectionCode:  sec.sectionCode,
      courseName:   sec.courseName,
      roomNumber:   sec.roomNumber,
      terminalId:   sec.terminalId,
      facultyId:    sec.facultyId,
      lateStr:      String(sec.defaultLateThresholdMins),
      cutStr:       String(sec.defaultCutThresholdMins),
      scheduleDay:  sec.scheduleDay || '',
      scheduleTime: sec.scheduleTime || '',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  /** Called when user clicks "Create Section" in the form modal — shows confirm step */
  const handleAddFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    // Validate thresholds
    const late = parseInt(form.lateStr);
    const cut  = parseInt(form.cutStr);
    if (isNaN(late) || late < 1 || late > 120) { setFormError('Late window must be 1–120 minutes.'); return; }
    if (isNaN(cut)  || cut  < 2 || cut  > 240) { setFormError('Cut window must be 2–240 minutes.'); return; }
    if (cut <= late) { setFormError('Cut window must be greater than the Late window.'); return; }
    setIsConfirmModalOpen(true);
  };

  /** Final API call after confirm */
  const handleCreateSection = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sectionCode:             form.sectionCode,
          courseName:              form.courseName,
          roomNumber:              form.roomNumber,
          terminalId:              form.terminalId,
          facultyId:               form.facultyId,
          defaultLateThresholdMins: parseInt(form.lateStr),
          defaultCutThresholdMins:  parseInt(form.cutStr),
          scheduleDay:  form.scheduleDay  || null,
          scheduleTime: form.scheduleTime || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create section');

      setIsConfirmModalOpen(false);
      setIsAddModalOpen(false);
      fetchSections();
      toast.success('Section Created', `Successfully configured ${form.sectionCode} (${form.courseName}).`);
    } catch (err: any) {
      setFormError(err.message);
      setIsConfirmModalOpen(false);
      toast.error('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;
    setFormError(null);
    const late = parseInt(form.lateStr);
    const cut  = parseInt(form.cutStr);
    if (isNaN(late) || late < 1) { setFormError('Late window must be at least 1 minute.'); return; }
    if (isNaN(cut)  || cut  < 2) { setFormError('Cut window must be at least 2 minutes.'); return; }
    if (cut <= late) { setFormError('Cut window must be greater than the Late window.'); return; }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/sections/${selectedSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sectionCode:             form.sectionCode,
          courseName:              form.courseName,
          roomNumber:              form.roomNumber,
          terminalId:              form.terminalId,
          facultyId:               form.facultyId,
          defaultLateThresholdMins: late,
          defaultCutThresholdMins:  cut,
          scheduleDay:  form.scheduleDay  || null,
          scheduleTime: form.scheduleTime || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update section');

      setIsEditModalOpen(false);
      fetchSections();
      toast.success('Section Updated', `Saved settings for ${form.sectionCode}.`);
    } catch (err: any) {
      setFormError(err.message);
      toast.error('Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSection) return;
    setIsSubmitting(true);
    try {
      const res  = await fetch(`${API_V1_URL}/sections/${selectedSection.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete section');

      setIsDeleteModalOpen(false);
      fetchSections();
      toast.success('Section Deleted', `Removed ${selectedSection.sectionCode} from database.`);
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAdd  = useCallback(() => { setIsAddModalOpen(false);  setFormError(null); }, []);
  const closeEdit = useCallback(() => { setIsEditModalOpen(false); setFormError(null); }, []);

  /* ─── Shared form fields JSX (used in both Add and Edit modals) ─── */
  const renderFormFields = () => (
    <>
      {formError && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {formError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Section Code *</label>
          <input
            type="text" required
            placeholder="AR101-BSIT3A"
            value={form.sectionCode}
            onChange={(e) => setForm({ ...form, sectionCode: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Room Number *</label>
          <input
            type="text" required
            placeholder="LAB-304"
            value={form.roomNumber}
            onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1">Course Title *</label>
        <input
          type="text" required
          placeholder="Computer Architecture and Organization"
          value={form.courseName}
          onChange={(e) => setForm({ ...form, courseName: e.target.value })}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Terminal Node ID *</label>
          <input
            type="text" required
            placeholder="TERM-CL304"
            value={form.terminalId}
            onChange={(e) => setForm({ ...form, terminalId: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Faculty *</label>
          <select
            required
            value={form.facultyId}
            onChange={(e) => setForm({ ...form, facultyId: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          >
            <option value="">Select Instructor...</option>
            {facultyList.map((f) => (
              <option key={f.id} value={f.id}>
                Prof. {f.firstName} {f.lastName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Schedule ── */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Class Schedule <span className="text-slate-500 font-normal">(optional)</span></span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Day(s)</label>
            <select
              value={form.scheduleDay}
              onChange={(e) => setForm({ ...form, scheduleDay: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            >
              <option value="">Not set</option>
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Start Time</label>
            <input
              type="time"
              value={form.scheduleTime}
              onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>
        </div>
      </div>

      {/* ── Thresholds — stored as strings to allow free backspace editing ── */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Punctuality Grace Windows</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Late Window (mins)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="15"
              value={form.lateStr}
              onChange={(e) => setForm({ ...form, lateStr: e.target.value.replace(/[^0-9]/g, '') })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-amber-500/40"
            />
            <p className="text-[10px] text-slate-500 mt-1">Tap before this → <span className="text-amber-400">LATE</span></p>
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Cut Window (mins)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="45"
              value={form.cutStr}
              onChange={(e) => setForm({ ...form, cutStr: e.target.value.replace(/[^0-9]/g, '') })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-rose-500/40"
            />
            <p className="text-[10px] text-slate-500 mt-1">Tap after this → <span className="text-rose-400">CUT</span></p>
          </div>
        </div>
      </div>
    </>
  );

  const selectedFaculty = facultyList.find((f) => f.id === form.facultyId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <span>Classroom & Course Sections</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure course sections, assign faculty instructors, and calibrate punctuality grace thresholds
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline" size="sm"
            onClick={() => { fetchSections(); toast.info('Sections Synced', 'Course section roster updated.'); }}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="h-9 px-3.5 border-white/[0.08] hover:border-white/[0.15]"
          >
            Refresh
          </Button>
          <Button
            variant="primary" size="sm"
            onClick={openAddModal}
            leftIcon={<Plus className="w-4 h-4" />}
            className="h-9 px-3.5 bg-purple-600 hover:bg-purple-500 border border-purple-400/30 shadow-md shadow-purple-600/20"
          >
            Create New Section
          </Button>
        </div>
      </div>

      {/* Search & Filter Ribbon */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">Sections Directory:</span>
          <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-bold">
            {sections.length} Configured
          </span>
          {searchQuery && (
            <span className="text-xs text-slate-400 font-mono">({filteredSections.length} matched)</span>
          )}
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, course, faculty, or room..."
            className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
          />
        </div>
      </div>

      {/* Sections Grid */}
      {filteredSections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/[0.05] text-slate-500 text-xs">
          {sections.length === 0
            ? 'No course sections configured. Click "Create New Section" above to register one.'
            : `No course sections match "${searchQuery}".`}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((sec) => (
            <div
              key={sec.id}
              className="p-5 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm flex flex-col justify-between hover:border-white/[0.12] transition shadow-xs group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                      {sec.sectionCode}
                    </span>
                    <h3 className="text-sm font-semibold text-white mt-2 leading-snug">{sec.courseName}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => openEditModal(sec)}
                      className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-slate-200 transition"
                      title="Edit Section Settings"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelectedSection(sec); setIsDeleteModalOpen(true); }}
                      className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition"
                      title="Delete Section"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-300">
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-slate-400">Assigned Instructor:</span>
                    <span className="font-medium text-slate-200">Prof. {sec.faculty.firstName} {sec.faculty.lastName}</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-slate-400">Location & Node:</span>
                    <span className="font-mono text-slate-200">{sec.roomNumber} ({sec.terminalId})</span>
                  </div>
                  {(sec.scheduleDay || sec.scheduleTime) && (
                    <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                      <span className="text-slate-400">Schedule:</span>
                      <span className="font-mono text-sky-300 text-[11px]">
                        {sec.scheduleDay && DAYS.find((d) => d.value === sec.scheduleDay)?.label}
                        {sec.scheduleDay && sec.scheduleTime && ' · '}
                        {sec.scheduleTime && (() => {
                          const [h, m] = sec.scheduleTime.split(':');
                          const hour = parseInt(h);
                          return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
                        })()}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-slate-400">Grace Windows:</span>
                    <span className="font-mono text-slate-200">
                      Late: {sec.defaultLateThresholdMins}m &bull; Cut: {sec.defaultCutThresholdMins}m
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-white/[0.05] flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs text-slate-400">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>{sec._count.enrollments} Enrolled</span>
                </div>
                <button
                  onClick={() => navigate(`/admin/enrollments?sectionId=${sec.id}`)}
                  className="px-2.5 py-1 rounded-lg bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-300 hover:text-white transition flex items-center gap-1 text-[11px] font-medium"
                >
                  <span>Manage Roster</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Add Section Form Modal ───────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={closeAdd} title="Create Course Section" hideFooter>
        <form onSubmit={handleAddFormSubmit} className="space-y-4">
          {renderFormFields()}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={closeAdd}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm">Review & Create</Button>
          </div>
        </form>
      </Modal>

      {/* ── Confirm Create Modal ─────────────────────────────── */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Confirm New Section"
        hideFooter
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.06] space-y-2.5 text-xs">
            <Row label="Section Code"   value={<span className="font-mono font-bold text-purple-300">{form.sectionCode}</span>} />
            <Row label="Course Title"   value={form.courseName} />
            <Row label="Room / Terminal" value={<span className="font-mono">{form.roomNumber} · {form.terminalId}</span>} />
            <Row label="Instructor"     value={selectedFaculty ? `Prof. ${selectedFaculty.firstName} ${selectedFaculty.lastName}` : '—'} />
            {(form.scheduleDay || form.scheduleTime) && (
              <Row
                label="Schedule"
                value={
                  <span className="font-mono text-sky-300">
                    {form.scheduleDay && DAYS.find((d) => d.value === form.scheduleDay)?.label}
                    {form.scheduleDay && form.scheduleTime && ' · '}
                    {form.scheduleTime && (() => {
                      const [h, m] = form.scheduleTime.split(':');
                      const hour = parseInt(h);
                      return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
                    })()}
                  </span>
                }
              />
            )}
            <Row label="Late Window"    value={<span className="font-mono text-amber-300">{form.lateStr} min</span>} />
            <Row label="Cut Window"     value={<span className="font-mono text-rose-300">{form.cutStr} min</span>} />
          </div>

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2 text-[11px] text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Once created, this section will be immediately available for enrollment and session activation at terminal <strong className="font-mono">{form.terminalId}</strong>.</span>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button variant="outline" size="sm" onClick={() => setIsConfirmModalOpen(false)}>Go Back</Button>
            <Button
              variant="primary" size="sm"
              onClick={handleCreateSection}
              disabled={isSubmitting}
              leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30"
            >
              {isSubmitting ? 'Creating...' : 'Confirm & Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Edit Section Modal ───────────────────────────────── */}
      <Modal isOpen={isEditModalOpen} onClose={closeEdit} title="Edit Section Configuration" hideFooter>
        <form onSubmit={handleUpdateSection} className="space-y-4">
          {renderFormFields()}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={closeEdit}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────────────── */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Course Section" hideFooter>
        <div className="space-y-4">
          <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06]">
            <div className="font-mono text-xs font-bold text-purple-300 mb-0.5">{selectedSection?.sectionCode}</div>
            <div className="text-sm text-white font-medium">{selectedSection?.courseName}</div>
            <div className="text-[11px] text-slate-400 mt-1">
              Prof. {selectedSection?.faculty?.firstName} {selectedSection?.faculty?.lastName} · {selectedSection?.roomNumber}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300/80 leading-relaxed">
            <strong className="text-rose-400">Warning:</strong> All enrolled student bindings and historical sessions for this section will be permanently removed. This cannot be undone.
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={handleDeleteSection} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Section'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

/** Reusable key-value row for the confirm modal */
const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-4 py-1 border-b border-white/[0.04] last:border-0">
    <span className="text-slate-400 shrink-0">{label}</span>
    <span className="text-slate-200 text-right">{value}</span>
  </div>
);
