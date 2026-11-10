import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Edit2, Trash2, Clock, Users, RefreshCw, AlertCircle, Search, ArrowRight } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
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
  faculty: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  defaultLateThresholdMins: number;
  defaultCutThresholdMins: number;
  _count: {
    enrollments: number;
    sessions: number;
  };
}

interface FacultyOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export const AdminSectionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSections = sections.filter((sec: SectionItem) => {
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

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);

  // Form
  const [formData, setFormData] = useState({
    sectionCode: '',
    courseName: '',
    roomNumber: 'LAB-304',
    terminalId: 'TERM-CL304',
    facultyId: '',
    defaultLateThresholdMins: 15,
    defaultCutThresholdMins: 45,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchSections();
    fetchFacultyList();
  }, []);

  const fetchSections = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_V1_URL}/sections`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSections(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFacultyList = async () => {
    try {
      const res = await fetch(`${API_V1_URL}/users?role=FACULTY`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setFacultyList(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch faculty:', err);
    }
  };

  const openAddModal = () => {
    setFormData({
      sectionCode: '',
      courseName: '',
      roomNumber: 'LAB-304',
      terminalId: 'TERM-CL304',
      facultyId: facultyList[0]?.id || '',
      defaultLateThresholdMins: 15,
      defaultCutThresholdMins: 45,
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (sec: SectionItem) => {
    setSelectedSection(sec);
    setFormData({
      sectionCode: sec.sectionCode,
      courseName: sec.courseName,
      roomNumber: sec.roomNumber,
      terminalId: sec.terminalId,
      facultyId: sec.facultyId,
      defaultLateThresholdMins: sec.defaultLateThresholdMins,
      defaultCutThresholdMins: sec.defaultCutThresholdMins,
    });
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_V1_URL}/sections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create section');
      }

      setIsAddModalOpen(false);
      fetchSections();
      toast.success('Section Created', `Successfully configured ${formData.sectionCode} (${formData.courseName}).`);
    } catch (err: any) {
      setFormError(err.message);
      toast.error('Creation Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSection) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_V1_URL}/sections/${selectedSection.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update section');
      }

      setIsEditModalOpen(false);
      fetchSections();
      toast.success('Section Updated', `Saved settings for ${formData.sectionCode}.`);
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
      const res = await fetch(`${API_V1_URL}/sections/${selectedSection.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete section');
      }

      setIsDeleteModalOpen(false);
      fetchSections();
      toast.success('Section Deleted', `Removed ${selectedSection.sectionCode} from database.`);
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Configure course sections, assign designated faculty instructors, and calibrate punctuality grace thresholds
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchSections();
              toast.info('Sections Synced', 'Course section roster updated.');
            }}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="h-9 px-3.5 border-white/[0.08] hover:border-white/[0.15]"
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
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
            <span className="text-xs text-slate-400 font-mono">
              ({filteredSections.length} matched)
            </span>
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
                      onClick={() => {
                        setSelectedSection(sec);
                        setIsDeleteModalOpen(true);
                      }}
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
                    <span className="font-medium text-slate-200">
                      Prof. {sec.faculty.firstName} {sec.faculty.lastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/[0.05]">
                    <span className="text-slate-400">Location & Node:</span>
                    <span className="font-mono text-slate-200">
                      {sec.roomNumber} ({sec.terminalId})
                    </span>
                  </div>
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

      {/* Add Section Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Create Course Section" hideFooter>
        <form onSubmit={handleCreateSection} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Section Code *</label>
              <input
                type="text"
                required
                placeholder="AR101-BSIT3A"
                value={formData.sectionCode}
                onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Room Number *</label>
              <input
                type="text"
                required
                placeholder="LAB-304"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Course Title *</label>
            <input
              type="text"
              required
              placeholder="Computer Architecture and Organization"
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Terminal Node ID *</label>
              <input
                type="text"
                required
                placeholder="TERM-CL304"
                value={formData.terminalId}
                onChange={(e) => setFormData({ ...formData, terminalId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Faculty Instructor *</label>
              <select
                required
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                <option value="">Select Instructor...</option>
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    Prof. {f.firstName} {f.lastName} ({f.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Late Grace Window (Mins)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={formData.defaultLateThresholdMins}
                onChange={(e) => setFormData({ ...formData, defaultLateThresholdMins: parseInt(e.target.value) || 15 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Cut Grace Window (Mins)</label>
              <input
                type="number"
                min={2}
                max={240}
                value={formData.defaultCutThresholdMins}
                onChange={(e) => setFormData({ ...formData, defaultCutThresholdMins: parseInt(e.target.value) || 45 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Section'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Section Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Section Configuration" hideFooter>
        <form onSubmit={handleUpdateSection} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Section Code *</label>
              <input
                type="text"
                required
                value={formData.sectionCode}
                onChange={(e) => setFormData({ ...formData, sectionCode: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Room Number *</label>
              <input
                type="text"
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Course Title *</label>
            <input
              type="text"
              required
              value={formData.courseName}
              onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Terminal Node ID *</label>
              <input
                type="text"
                required
                value={formData.terminalId}
                onChange={(e) => setFormData({ ...formData, terminalId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Faculty Instructor *</label>
              <select
                required
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
              >
                {facultyList.map((f) => (
                  <option key={f.id} value={f.id}>
                    Prof. {f.firstName} {f.lastName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Late Window (Mins)</label>
              <input
                type="number"
                min={1}
                value={formData.defaultLateThresholdMins}
                onChange={(e) => setFormData({ ...formData, defaultLateThresholdMins: parseInt(e.target.value) || 15 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Default Cut Window (Mins)</label>
              <input
                type="number"
                min={2}
                value={formData.defaultCutThresholdMins}
                onChange={(e) => setFormData({ ...formData, defaultCutThresholdMins: parseInt(e.target.value) || 45 })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Section Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Delete Course Section" hideFooter>
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            Are you sure you want to delete <strong className="text-white">{selectedSection?.sectionCode}</strong>?
            All enrolled student bindings and historical sessions for this section will be removed.
          </p>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteSection} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete Section'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

