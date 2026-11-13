import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, Plus, Edit2, Trash2, Clock, Users, RefreshCw,
  Search, ArrowRight, Calendar, CheckCircle2, AlertCircle,
  Keyboard, SlidersHorizontal, Copy, Check, Filter, Layers,
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
  scheduleEndTime: string | null;
  _count: { enrollments: number; sessions: number };
}

interface FacultyOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const INDIVIDUAL_DAYS = [
  { value: 'Mon', label: 'Monday' },
  { value: 'Tue', label: 'Tuesday' },
  { value: 'Wed', label: 'Wednesday' },
  { value: 'Thu', label: 'Thursday' },
  { value: 'Fri', label: 'Friday' },
  { value: 'Sat', label: 'Saturday' },
  { value: 'Sun', label: 'Sunday' },
];

/** Parse single day or legacy multi-day string into a single selected day string */
const parseSingleDay = (raw: string | null): string => {
  if (!raw) return '';
  if (raw.includes(',')) {
    return raw.split(',')[0].trim();
  }
  if (raw === 'MWF' || raw === 'DAILY' || raw === 'MW') return 'Mon';
  if (raw === 'TTH' || raw === 'TTh' || raw === 'TF') return 'Tue';
  if (raw === 'SAT') return 'Sat';
  if (raw === 'SUN') return 'Sun';
  return raw;
};

/** Format stored "08:30" or "13:45" to "8:30 AM" */
const formatDisplayTime = (timeStr: string | null | undefined): string => {
  if (!timeStr) return '';
  const [hStr, mStr] = timeStr.split(':');
  const h = parseInt(hStr || '0', 10);
  const m = (mStr || '00').padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
};

/** Interactive Time Picker with editable hour/minute inputs, stepper buttons, and AM/PM */
const InteractiveTimePicker: React.FC<{
  value: string; // "HH:MM" 24h
  onChange: (val: string) => void;
  label?: string;
}> = ({ value, onChange, label }) => {
  const currentVal = value || '08:00';
  const [hStr, mStr] = currentVal.split(':');
  const h24 = parseInt(hStr || '8', 10);
  const m = parseInt(mStr || '0', 10);
  const isPM = h24 >= 12;
  const h12 = h24 % 12 || 12;

  const [hourInput, setHourInput] = useState(String(h12).padStart(2, '0'));
  const [minInput, setMinInput] = useState(String(m).padStart(2, '0'));

  useEffect(() => {
    setHourInput(String(h12).padStart(2, '0'));
    setMinInput(String(m).padStart(2, '0'));
  }, [h12, m]);

  const update = (newH24: number, newMin: number) => {
    const validH = (newH24 + 24) % 24;
    const validM = (newMin + 60) % 60;
    const hh = String(validH).padStart(2, '0');
    const mm = String(validM).padStart(2, '0');
    onChange(`${hh}:${mm}`);
  };

  const commitHour = (val: string) => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 1) parsed = 12;
    if (parsed > 12) parsed = 12;
    const newH24 = isPM ? (parsed === 12 ? 12 : parsed + 12) : (parsed === 12 ? 0 : parsed);
    update(newH24, m);
  };

  const commitMin = (val: string) => {
    let parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed < 0) parsed = 0;
    if (parsed > 59) parsed = 59;
    update(h24, parsed);
  };

  const spinBtnClass = 'w-7 h-5 flex items-center justify-center text-[10px] text-slate-400 hover:text-white hover:bg-white/[0.08] active:bg-white/[0.15] rounded transition focus:outline-none focus:ring-1 focus:ring-purple-400';

  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-[10px] font-mono text-slate-400">{label}</span>}
      <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950 border border-slate-700/80 w-fit select-none">
        {/* Hour Column */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => update(h24 + 1, m)}
            aria-label="Increment hour"
            className={spinBtnClass}
          >
            ▲
          </button>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={hourInput}
            aria-label="Hour (1-12)"
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9]/g, '');
              setHourInput(cleaned);
              if (cleaned.length === 2) {
                commitHour(cleaned);
              }
            }}
            onBlur={(e) => commitHour(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); update(h24 + 1, m); }
              if (e.key === 'ArrowDown') { e.preventDefault(); update(h24 - 1, m); }
              if (e.key === 'Enter') { e.preventDefault(); commitHour((e.target as HTMLInputElement).value); }
            }}
            className="w-8 h-6 font-mono text-xs font-bold text-white px-1 bg-slate-900 border border-white/[0.08] rounded-md text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
            title="Click or type hour (1-12)"
          />
          <button
            type="button"
            onClick={() => update(h24 - 1, m)}
            aria-label="Decrement hour"
            className={spinBtnClass}
          >
            ▼
          </button>
        </div>

        <span className="font-mono text-sm font-bold text-slate-500 pb-1" aria-hidden="true">:</span>

        {/* Minute Column (5-min increments on arrow, exact on type) */}
        <div className="flex flex-col items-center">
          <button
            type="button"
            onClick={() => update(h24, m + 5)}
            aria-label="Increment minutes"
            className={spinBtnClass}
          >
            ▲
          </button>
          <input
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={minInput}
            aria-label="Minute (00-59)"
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^0-9]/g, '');
              setMinInput(cleaned);
              if (cleaned.length === 2) {
                commitMin(cleaned);
              }
            }}
            onBlur={(e) => commitMin(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowUp') { e.preventDefault(); update(h24, m + 5); }
              if (e.key === 'ArrowDown') { e.preventDefault(); update(h24, m - 5); }
              if (e.key === 'Enter') { e.preventDefault(); commitMin((e.target as HTMLInputElement).value); }
            }}
            className="w-8 h-6 font-mono text-xs font-bold text-white px-1 bg-slate-900 border border-white/[0.08] rounded-md text-center focus:outline-none focus:ring-1 focus:ring-purple-500"
            title="Click or type minute (00-59)"
          />
          <button
            type="button"
            onClick={() => update(h24, m - 5)}
            aria-label="Decrement minutes"
            className={spinBtnClass}
          >
            ▼
          </button>
        </div>

        {/* AM / PM Toggle */}
        <div className="flex flex-col gap-1 ml-1" role="group" aria-label="Meridiem selection">
          <button
            type="button"
            aria-pressed={!isPM}
            onClick={() => { if (isPM) update(h24 - 12, m); }}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition focus:outline-none focus:ring-1 focus:ring-purple-400 ${
              !isPM
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 bg-white/[0.03]'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            aria-pressed={isPM}
            onClick={() => { if (!isPM) update(h24 + 12, m); }}
            className={`px-2 py-1 rounded text-[10px] font-mono font-bold transition focus:outline-none focus:ring-1 focus:ring-purple-400 ${
              isPM
                ? 'bg-purple-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200 bg-white/[0.03]'
            }`}
          >
            PM
          </button>
        </div>
      </div>
    </div>
  );
};

const emptyForm = {
  sectionCode: '',
  courseName: '',
  roomNumber: 'LAB-304',
  terminalId: 'TERM-CL304',
  facultyId: '',
  lateStr: '15',
  cutStr: '45',
  selectedDay: '', // exactly ONE day limit
  scheduleTime: '08:00',
  scheduleEndTime: '10:00',
};

export const AdminSectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Quick Filters & Live Window states
  const [filterMode, setFilterMode] = useState<'all' | 'today' | 'room'>('all');
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [copiedSectionId, setCopiedSectionId] = useState<string | null>(null);
  const [, setCurrentTimeTick] = useState<number>(Date.now());

  // 30s heartbeat to keep live "Class Window Active" status real-time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTimeTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const DAY_ABBREVS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  /** Check if a section's schedule matches today */
  const isSectionScheduledToday = (sec: SectionItem): boolean => {
    if (!sec.scheduleDay) return false;
    const now = new Date();
    const dayIndex = now.getDay();
    const todayAbbrev = DAY_ABBREVS[dayIndex];
    const todayFullName = DAY_FULL[dayIndex];
    const raw = sec.scheduleDay.trim();
    return (
      raw.includes(todayAbbrev) ||
      raw.toLowerCase().includes(todayFullName.toLowerCase()) ||
      parseSingleDay(raw) === todayAbbrev
    );
  };

  /** Check if current time is within section schedule window today */
  const isClassWindowActive = (sec: SectionItem): boolean => {
    if (!sec.scheduleDay || !sec.scheduleTime || !sec.scheduleEndTime) return false;
    if (!isSectionScheduledToday(sec)) return false;

    const now = new Date();
    const currentMin = now.getHours() * 60 + now.getMinutes();

    const parseMin = (tStr: string) => {
      const [h, m] = tStr.split(':');
      return parseInt(h || '0', 10) * 60 + parseInt(m || '0', 10);
    };

    const startMin = parseMin(sec.scheduleTime);
    const endMin = parseMin(sec.scheduleEndTime);

    return currentMin >= startMin && currentMin <= endMin;
  };

  const availableRooms = Array.from(new Set(sections.map((s) => s.roomNumber).filter(Boolean))).sort();
  const scheduledTodayCount = sections.filter(isSectionScheduledToday).length;

  const filteredSections = sections.filter((sec) => {
    // 1. Quick Filter Mode
    if (filterMode === 'today') {
      if (!isSectionScheduledToday(sec)) return false;
    } else if (filterMode === 'room') {
      if (selectedRoom !== 'all' && sec.roomNumber !== selectedRoom) {
        return false;
      }
    }

    // 2. Search Query
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

  const handleCopyCodeAndSchedule = (sec: SectionItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const scheduleFormatted = sec.scheduleDay
      ? `${sec.scheduleDay} ${formatDisplayTime(sec.scheduleTime)}${sec.scheduleEndTime ? ` - ${formatDisplayTime(sec.scheduleEndTime)}` : ''}`
      : 'No schedule set';
    const textToCopy = `[${sec.sectionCode}] ${sec.courseName}\nSchedule: ${scheduleFormatted}\nLocation: ${sec.roomNumber} (${sec.terminalId})\nFaculty: Prof. ${sec.faculty?.firstName || ''} ${sec.faculty?.lastName || ''}`;

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(textToCopy).catch((err) => {
        console.warn('Clipboard write failed:', err);
      });
    }
    setCopiedSectionId(sec.id);
    setTimeout(() => {
      setCopiedSectionId((prev) => (prev === sec.id ? null : prev));
    }, 2000);
    toast.success('Copied to Clipboard', `Copied ${sec.sectionCode} code & schedule details.`);
  };

  // Modals
  const [isAddModalOpen, setIsAddModalOpen]         = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen]       = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen]   = useState(false);
  const [selectedSection, setSelectedSection]       = useState<SectionItem | null>(null);

  const [form, setForm]           = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeInputMode, setTimeInputMode] = useState<'manual' | 'picker'>('manual');

  useEffect(() => {
    fetchSections();
    fetchFacultyList();
  }, []);

  const fetchSections = async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const res  = await fetch(`${API_V1_URL}/sections`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to retrieve course sections');
      setSections(json.data || []);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error('Failed to fetch sections:', err);
      setFetchError(errMsg || 'Failed to load course sections. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFacultyList = async () => {
    try {
      const res  = await fetch(`${API_V1_URL}/users?role=FACULTY`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setFacultyList(json.data || []);
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
      sectionCode:     sec.sectionCode,
      courseName:      sec.courseName,
      roomNumber:      sec.roomNumber,
      terminalId:      sec.terminalId,
      facultyId:       sec.facultyId,
      lateStr:         String(sec.defaultLateThresholdMins),
      cutStr:          String(sec.defaultCutThresholdMins),
      selectedDay:     parseSingleDay(sec.scheduleDay),
      scheduleTime:    sec.scheduleTime || '08:00',
      scheduleEndTime: sec.scheduleEndTime || '10:00',
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  // Limit day to strictly one choice (clicking active day deselects it)
  const selectSingleDay = (day: string) => {
    setForm((prev) => ({
      ...prev,
      selectedDay: prev.selectedDay === day ? '' : day,
    }));
  };

  const validateSectionForm = (): string | null => {
    if (!form.sectionCode.trim()) return 'Section code is required.';
    if (!form.roomNumber.trim()) return 'Room number is required.';
    if (!form.courseName.trim()) return 'Course title is required.';
    if (!form.terminalId.trim()) return 'Terminal Node ID is required.';
    if (!form.facultyId) return 'Please select an assigned instructor.';

    const late = parseInt(form.lateStr, 10);
    const cut  = parseInt(form.cutStr, 10);
    if (isNaN(late) || late < 1 || late > 120) return 'Late window must be 1–120 minutes.';
    if (isNaN(cut)  || cut  < 2 || cut  > 240) return 'Cut window must be 2–240 minutes.';
    if (cut <= late) return 'Cut window must be greater than the Late window.';

    if (form.scheduleTime && form.scheduleEndTime && form.scheduleEndTime <= form.scheduleTime) {
      return 'Class end time must be later than start time.';
    }
    return null;
  };

  /** Form review trigger */
  const handleAddFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const err = validateSectionForm();
    if (err) {
      setFormError(err);
      return;
    }
    setIsConfirmModalOpen(true);
  };

  /** Create section after confirmation */
  const handleCreateSection = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sectionCode:              form.sectionCode.trim().toUpperCase(),
          courseName:               form.courseName.trim(),
          roomNumber:               form.roomNumber.trim(),
          terminalId:               form.terminalId.trim().toUpperCase(),
          facultyId:                form.facultyId,
          defaultLateThresholdMins: parseInt(form.lateStr, 10),
          defaultCutThresholdMins:  parseInt(form.cutStr, 10),
          scheduleDay:              form.selectedDay || null,
          scheduleTime:             form.scheduleTime || null,
          scheduleEndTime:          form.scheduleEndTime || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to create section');

      setIsConfirmModalOpen(false);
      setIsAddModalOpen(false);
      fetchSections();
      toast.success('Section Created', `Successfully configured ${form.sectionCode.trim().toUpperCase()} (${form.courseName.trim()}).`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setFormError(errMsg);
      setIsConfirmModalOpen(false);
      toast.error('Creation Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;
    setFormError(null);
    const err = validateSectionForm();
    if (err) {
      setFormError(err);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/sections/${selectedSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sectionCode:              form.sectionCode.trim().toUpperCase(),
          courseName:               form.courseName.trim(),
          roomNumber:               form.roomNumber.trim(),
          terminalId:               form.terminalId.trim().toUpperCase(),
          facultyId:                form.facultyId,
          defaultLateThresholdMins: parseInt(form.lateStr, 10),
          defaultCutThresholdMins:  parseInt(form.cutStr, 10),
          scheduleDay:              form.selectedDay || null,
          scheduleTime:             form.scheduleTime || null,
          scheduleEndTime:          form.scheduleEndTime || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to update section');

      setIsEditModalOpen(false);
      fetchSections();
      toast.success('Section Updated', `Saved settings for ${form.sectionCode.trim().toUpperCase()}.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setFormError(errMsg);
      toast.error('Update Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSection = async () => {
    if (!selectedSection) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/sections/${selectedSection.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to delete section');

      setIsDeleteModalOpen(false);
      fetchSections();
      toast.success('Section Deleted', `Removed ${selectedSection.sectionCode} from database.`);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error('Deletion Failed', errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeAdd  = useCallback(() => { setIsAddModalOpen(false);  setFormError(null); }, []);
  const closeEdit = useCallback(() => { setIsEditModalOpen(false); setFormError(null); }, []);

  /* ─── Shared form fields (Add & Edit) ─── */
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

      {/* ── Schedule: One Day Only & Class Start/End Time ── */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/[0.06] space-y-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
          <Calendar className="w-3.5 h-3.5 text-purple-400" />
          <span>Class Schedule <span className="text-slate-500 font-normal">(1 day limit, with Start & End Time)</span></span>
        </div>

        {/* 1 Day Limit Radio-Style Selection */}
        <div>
          <label className="block text-[11px] text-slate-400 mb-2">Class Day (Select 1 Day Only):</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
            {INDIVIDUAL_DAYS.map((d) => {
              const isSelected = form.selectedDay === d.value;
              return (
                <button
                  type="button"
                  key={d.value}
                  aria-pressed={isSelected}
                  aria-label={`Select ${d.label}`}
                  onClick={() => selectSingleDay(d.value)}
                  className={`py-1.5 px-2 min-h-[36px] flex items-center justify-center rounded-lg text-xs font-medium transition border text-center focus:outline-none focus:ring-1 focus:ring-purple-400 ${
                    isSelected
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 font-bold shadow-xs'
                      : 'bg-slate-900 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/[0.15]'
                  }`}
                >
                  {d.value}
                </button>
              );
            })}
          </div>
          {form.selectedDay ? (
            <div className="text-[11px] text-purple-300 font-mono mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
              <span>Assigned Schedule: Every <strong>{form.selectedDay}</strong></span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-mono mt-1.5">
              No day selected (optional)
            </div>
          )}
        </div>

        {/* Start Time and End Time Input Options */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[11px] text-slate-400 font-medium">Class Time Window:</label>
            <div className="flex items-center bg-slate-900 border border-white/[0.08] p-0.5 rounded-lg text-[10px] font-mono" role="group" aria-label="Time input method">
              <button
                type="button"
                aria-pressed={timeInputMode === 'manual'}
                onClick={() => setTimeInputMode('manual')}
                className={`px-2 py-1 rounded flex items-center gap-1 transition focus:outline-none focus:ring-1 focus:ring-purple-400 ${
                  timeInputMode === 'manual'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Input/type time directly using keyboard"
              >
                <Keyboard className="w-3 h-3" />
                <span>Type Time</span>
              </button>
              <button
                type="button"
                aria-pressed={timeInputMode === 'picker'}
                onClick={() => setTimeInputMode('picker')}
                className={`px-2 py-1 rounded flex items-center gap-1 transition focus:outline-none focus:ring-1 focus:ring-purple-400 ${
                  timeInputMode === 'picker'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Use visual stepper picker"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Stepper</span>
              </button>
            </div>
          </div>

          {timeInputMode === 'manual' ? (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-white/[0.06] space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                    <span>Start Time:</span>
                    <span className="text-purple-300 font-bold">{formatDisplayTime(form.scheduleTime)}</span>
                  </label>
                  <input
                    type="time"
                    aria-label="Class Start Time"
                    value={form.scheduleTime || '08:00'}
                    onChange={(e) => setForm({ ...form, scheduleTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 mb-1 flex items-center justify-between">
                    <span>End Time:</span>
                    <span className="text-purple-300 font-bold">{formatDisplayTime(form.scheduleEndTime)}</span>
                  </label>
                  <input
                    type="time"
                    aria-label="Class End Time"
                    value={form.scheduleEndTime || '10:00'}
                    onChange={(e) => setForm({ ...form, scheduleEndTime: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [color-scheme:dark]"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-500 font-mono">
                💡 Tip: Click each input to type the hours and minutes with keyboard, or switch to Stepper mode.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <InteractiveTimePicker
                label="Start Time"
                value={form.scheduleTime}
                onChange={(t) => setForm({ ...form, scheduleTime: t })}
              />
              <div className="hidden sm:block text-slate-500 font-bold text-xs mt-4" aria-hidden="true">→</div>
              <InteractiveTimePicker
                label="End Time"
                value={form.scheduleEndTime}
                onChange={(t) => setForm({ ...form, scheduleEndTime: t })}
              />
            </div>
          )}

          <div className="text-xs text-slate-400 font-mono mt-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-sky-400" />
            <span>
              Schedule:{' '}
              <span className="text-sky-300 font-bold">
                {formatDisplayTime(form.scheduleTime)} - {formatDisplayTime(form.scheduleEndTime)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* ── Thresholds ── */}
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
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-400">Sections Directory:</span>
            <span className="px-2 py-0.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono text-xs font-bold">
              {sections.length} Configured
            </span>
            {(searchQuery || filterMode !== 'all') && (
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

        {/* Quick Filter Chips */}
        <div className="pt-2.5 border-t border-white/[0.05] flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-400 mr-1 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-purple-400" />
            <span>Filter:</span>
          </span>

          {/* [All Sections] Chip */}
          <button
            type="button"
            onClick={() => {
              setFilterMode('all');
              setSelectedRoom('all');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
              filterMode === 'all'
                ? 'bg-purple-600 border-purple-500 text-white font-semibold shadow-xs shadow-purple-600/30'
                : 'bg-slate-950/80 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <span>All Sections</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              filterMode === 'all' ? 'bg-purple-800 text-purple-100' : 'bg-white/[0.06] text-slate-400'
            }`}>
              {sections.length}
            </span>
          </button>

          {/* [Scheduled Today] Chip */}
          <button
            type="button"
            onClick={() => setFilterMode('today')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
              filterMode === 'today'
                ? 'bg-purple-600 border-purple-500 text-white font-semibold shadow-xs shadow-purple-600/30'
                : 'bg-slate-950/80 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span>Scheduled Today ({DAY_FULL[new Date().getDay()]})</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
              filterMode === 'today' ? 'bg-purple-800 text-purple-100' : 'bg-white/[0.06] text-slate-400'
            }`}>
              {scheduledTodayCount}
            </span>
          </button>

          {/* [By Department/Room] Chip */}
          <button
            type="button"
            onClick={() => setFilterMode('room')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 border ${
              filterMode === 'room'
                ? 'bg-purple-600 border-purple-500 text-white font-semibold shadow-xs shadow-purple-600/30'
                : 'bg-slate-950/80 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>By Department/Room</span>
            {selectedRoom !== 'all' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                {selectedRoom}
              </span>
            )}
          </button>

          {/* Inline Room Selector dropdown */}
          {filterMode === 'room' && (
            <select
              aria-label="Filter by specific Room"
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              className="bg-slate-950 border border-purple-500/40 text-purple-200 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-400 font-mono"
            >
              <option value="all">All Rooms ({availableRooms.length})</option>
              {availableRooms.map((room) => (
                <option key={room} value={room}>
                  Room: {room}
                </option>
              ))}
            </select>
          )}

          {/* Clear Filters Button */}
          {(filterMode !== 'all' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setFilterMode('all');
                setSelectedRoom('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-purple-400 hover:text-purple-300 underline font-mono ml-auto py-1"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Fetch Error Banner */}
      {fetchError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span><strong>Connection Alert:</strong> {fetchError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSections}
            disabled={isLoading}
            className="text-xs shrink-0 border-rose-500/30 hover:bg-rose-500/10 text-rose-200 self-start sm:self-auto"
          >
            Retry Connection
          </Button>
        </div>
      )}

      {/* Sections Grid / Loading / Empty States */}
      {isLoading && sections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/[0.05] text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-purple-400 animate-spin" />
          <span>Loading course sections...</span>
        </div>
      ) : filteredSections.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-white/[0.05] flex flex-col items-center justify-center gap-3">
          {fetchError ? (
            <>
              <AlertCircle className="w-8 h-8 text-rose-400" />
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-semibold text-white">Connection Error</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  Unable to display sections due to a connection error. Click "Retry Connection" above.
                </p>
              </div>
            </>
          ) : sections.length === 0 ? (
            <>
              <BookOpen className="w-8 h-8 text-slate-500" />
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-semibold text-white">No Course Sections</h4>
                <p className="text-xs text-slate-400 max-w-sm">
                  No course sections configured. Click "Create New Section" above to register one.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-slate-400">
                <SlidersHorizontal className="w-6 h-6 text-purple-400" />
              </div>
              <div className="space-y-1 text-center">
                <h4 className="text-sm font-semibold text-white">No Matching Course Sections</h4>
                <p className="text-xs text-slate-400 max-w-md">
                  No course sections match your current criteria
                  {searchQuery ? ` matching "${searchQuery}"` : ''}
                  {filterMode === 'today' ? ` scheduled for today (${DAY_FULL[new Date().getDay()]})` : ''}
                  {filterMode === 'room' && selectedRoom !== 'all' ? ` in room "${selectedRoom}"` : ''}.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setFilterMode('all');
                  setSelectedRoom('all');
                }}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="mt-1 text-xs border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Reset All Filters
              </Button>
            </>
          )}
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
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-lg">
                        {sec.sectionCode}
                      </span>
                      {isClassWindowActive(sec) && (
                        <span
                          data-testid="class-window-active-badge"
                          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-xs shadow-emerald-500/20 animate-in fade-in"
                          title="Class Window Active (currently in scheduled session today)"
                        >
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span>Class Window Active</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white leading-snug">{sec.courseName}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleCopyCodeAndSchedule(sec, e)}
                      className={`p-1.5 rounded-lg border transition flex items-center gap-1 text-[11px] font-medium ${
                        copiedSectionId === sec.id
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-slate-400 hover:text-slate-200'
                      }`}
                      title="Copy Code & Schedule"
                      aria-label="Copy Code & Schedule"
                    >
                      {copiedSectionId === sec.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => openEditModal(sec)}
                      className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-slate-200 transition"
                      title="Edit Section Settings"
                      aria-label="Edit Section Settings"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setSelectedSection(sec); setIsDeleteModalOpen(true); }}
                      className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition"
                      title="Delete Section"
                      aria-label="Delete Section"
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
                        {sec.scheduleDay && <span>{sec.scheduleDay}</span>}
                        {sec.scheduleDay && sec.scheduleTime && ' · '}
                        {sec.scheduleTime && (
                          <span>
                            {formatDisplayTime(sec.scheduleTime)}
                            {sec.scheduleEndTime && ` - ${formatDisplayTime(sec.scheduleEndTime)}`}
                          </span>
                        )}
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
            {(form.selectedDay || form.scheduleTime) && (
              <Row
                label="Schedule"
                value={
                  <span className="font-mono text-sky-300">
                    {form.selectedDay && `Every ${form.selectedDay}`}
                    {form.selectedDay && form.scheduleTime && ' · '}
                    {form.scheduleTime && (
                      <span>
                        {formatDisplayTime(form.scheduleTime)}
                        {form.scheduleEndTime && ` - ${formatDisplayTime(form.scheduleEndTime)}`}
                      </span>
                    )}
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
