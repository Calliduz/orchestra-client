import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Users, UserPlus, Search, Edit2, Trash2, CheckCircle2, AlertCircle,
  RefreshCw, Upload, Download, CheckSquare, Square, Minus, FileText,
  ChevronDown, AlertTriangle,
} from 'lucide-react';
import { Button } from '../../components/ui/Button.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { useToast } from '../../context/ToastContext.js';
import { sounds } from '../../utils/audio.js';

interface UserItem {
  id: string;
  studentId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  rfidUid: string | null;
  department: string | null;
  createdAt: string;
  _count?: {
    enrollments: number;
    sectionsTaught: number;
  };
}

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  rfidUid: string;
  department: string;
  role: 'STUDENT' | 'FACULTY' | 'ADMIN';
  password: string;
  _error?: string;
}

interface MassAddResult {
  created: number;
  failed: number;
  results: { row: number; success: boolean; email: string; message?: string }[];
}

const CSV_TEMPLATE = `firstName,lastName,email,studentId,rfidUid,department,role,password
Juan,dela Cruz,juan@school.edu,2024-0001-CCS,,College of Computer Studies,STUDENT,
Maria,Santos,maria@school.edu,2024-0002-CCS,A1B2C3D4,College of Computer Studies,STUDENT,
`;

function parseCSV(raw: string): { rows: ParsedRow[]; errors: string[] } {
  const lines = raw.trim().split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], errors: ['CSV must have a header row and at least one data row.'] };

  const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const required = ['firstname', 'lastname', 'email'];
  const missing = required.filter((r) => !header.includes(r));
  if (missing.length > 0) return { rows: [], errors: [`Missing required columns: ${missing.join(', ')}`] };

  const col = (row: string[], name: string) => {
    const idx = header.indexOf(name);
    return idx >= 0 ? (row[idx] ?? '').trim() : '';
  };

  const rows: ParsedRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',');
    const rawRole = col(cells, 'role').toUpperCase();
    const role = (['STUDENT', 'FACULTY', 'ADMIN'].includes(rawRole) ? rawRole : 'STUDENT') as ParsedRow['role'];
    const email = col(cells, 'email');

    if (!col(cells, 'firstname') || !col(cells, 'lastname') || !email) {
      errors.push(`Row ${i + 1}: firstName, lastName, and email are required.`);
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${i + 1}: Invalid email "${email}".`);
      continue;
    }

    rows.push({
      firstName: col(cells, 'firstname'),
      lastName: col(cells, 'lastname'),
      email,
      studentId: col(cells, 'studentid'),
      rfidUid: col(cells, 'rfiduid'),
      department: col(cells, 'department') || 'College of Computer Studies',
      role,
      password: col(cells, 'password'),
      _error: undefined,
    });
  }

  return { rows, errors };
}

export const AdminUsersPage: React.FC = () => {
  const { token } = useAuth();
  const { socket, isConnected, terminalId } = useSocket();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'FACULTY' | 'ADMIN'>('ALL');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // RFID Intercept state
  const [scannedIntercept, setScannedIntercept] = useState<{
    uid: string;
    isRegistered: boolean;
    holderName?: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'STUDENT' as 'STUDENT' | 'FACULTY' | 'ADMIN',
    studentId: '',
    rfidUid: '',
    department: 'College of Computer Studies',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Mass-select state ───────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMassDeleteModalOpen, setIsMassDeleteModalOpen] = useState(false);
  const [massDeleteResult, setMassDeleteResult] = useState<{ deleted: number; skipped: { name: string; reason: string }[] } | null>(null);

  // ── Mass Add (CSV Import) state ─────────────────────────────────────
  const [isMassAddModalOpen, setIsMassAddModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<ParsedRow[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [massAddResult, setMassAddResult] = useState<MassAddResult | null>(null);
  const csvFileRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, token]);

  // Live RFID Intercept when modals are open
  useEffect(() => {
    if (!socket) return;
    const handleCardScanned = (event: any) => {
      if (isAddModalOpen || isEditModalOpen) {
        setFormData((prev) => ({ ...prev, rfidUid: event.rfidUid }));
        setScannedIntercept({
          uid: event.rfidUid,
          isRegistered: event.isRegistered,
          holderName: event.cardHolder?.name,
        });
        sounds.playKeyChirp();
        toast.info('RFID Tag Captured', `Live badge 0x${event.rfidUid} populated from terminal.`);
      }
    };

    socket.on('card:scanned', handleCardScanned);
    return () => {
      socket.off('card:scanned', handleCardScanned);
    };
  }, [socket, isAddModalOpen, isEditModalOpen]);

  // Clean up enrollment mode on unmount
  useEffect(() => {
    return () => {
      stopHardwareEnrollment();
    };
  }, []);

  const startHardwareEnrollment = async (role: string, name?: string) => {
    try {
      await fetch(`${API_V1_URL}/hardware/enrollment/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          terminalId,
          targetRole: role,
          targetName: name || undefined,
        }),
      });
    } catch (err) {
      console.warn('Failed to start hardware enrollment mode:', err);
    }
  };

  const stopHardwareEnrollment = async () => {
    try {
      await fetch(`${API_V1_URL}/hardware/enrollment/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ terminalId }),
      });
    } catch (err) {
      console.warn('Failed to stop hardware enrollment mode:', err);
    }
  };

  const closeModals = useCallback(() => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    stopHardwareEnrollment();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const url = new URL(`${API_V1_URL}/users`);
      if (roleFilter !== 'ALL') {
        url.searchParams.set('role', roleFilter);
      }
      if (search.trim()) {
        url.searchParams.set('search', search.trim());
      }

      const res = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const openAddModal = () => {
    setScannedIntercept(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: 'Password123!',
      role: 'STUDENT',
      studentId: '',
      rfidUid: '',
      department: 'College of Computer Studies',
    });
    setFormError(null);
    setIsAddModalOpen(true);
    startHardwareEnrollment('STUDENT');
  };

  const openEditModal = (user: UserItem) => {
    setSelectedUser(user);
    setScannedIntercept(null);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      password: '',
      role: user.role,
      studentId: user.studentId || '',
      rfidUid: user.rfidUid || '',
      department: user.department || 'College of Computer Studies',
    });
    setFormError(null);
    setIsEditModalOpen(true);
    startHardwareEnrollment(user.role, `${user.firstName} ${user.lastName}`);
  };

  const openDeleteModal = (user: UserItem) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        password: formData.role === 'STUDENT' ? (formData.password || 'StudentPass123!') : formData.password,
      };

      const res = await fetch(`${API_V1_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to create user');
      }

      setIsAddModalOpen(false);
      stopHardwareEnrollment();
      fetchUsers();
      toast.success('User Created', `Successfully registered ${formData.firstName} ${formData.lastName}.`);
    } catch (err: any) {
      setFormError(err.message);
      toast.error('Registration Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload: any = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        role: formData.role,
        studentId: formData.studentId || null,
        rfidUid: formData.rfidUid || null,
        department: formData.department,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

      const res = await fetch(`${API_V1_URL}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to update user');
      }

      setIsEditModalOpen(false);
      stopHardwareEnrollment();
      fetchUsers();
      toast.success('User Updated', `Updated profile for ${formData.firstName} ${formData.lastName}.`);
    } catch (err: any) {
      setFormError(err.message);
      toast.error('Update Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_V1_URL}/users/${selectedUser.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete user');
      }

      setIsDeleteModalOpen(false);
      fetchUsers();
      toast.success('User Deleted', `Removed ${selectedUser.firstName} ${selectedUser.lastName} from directory.`);
    } catch (err: any) {
      toast.error('Deletion Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Mass-select helpers ─────────────────────────────────────────────
  const toggleSelectAll = () => {
    if (selectedIds.size === users.length && users.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleMassDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/users/bulk`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Mass delete failed');
      setMassDeleteResult(json.data);
      setSelectedIds(new Set());
      fetchUsers();
      toast.success('Mass Delete Complete', json.message);
    } catch (err: any) {
      toast.error('Mass Delete Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── CSV / Mass Add helpers ──────────────────────────────────────────
  const handleCsvTextChange = (text: string) => {
    setCsvText(text);
    setMassAddResult(null);
    if (!text.trim()) { setCsvPreview([]); setCsvErrors([]); return; }
    const { rows, errors } = parseCSV(text);
    setCsvPreview(rows);
    setCsvErrors(errors);
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => handleCsvTextChange(ev.target?.result as string ?? '');
    reader.readAsText(file);
  };

  const handleMassAdd = async () => {
    if (csvPreview.length === 0) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_V1_URL}/users/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ users: csvPreview }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || 'Mass add failed');
      setMassAddResult(json.data);
      fetchUsers();
      toast.success('Import Complete', json.message);
    } catch (err: any) {
      toast.error('Import Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'orchestra_users_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            <span>User & Enrollment Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage students, faculty instructors, roles, credentials, and RFID cards
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers();
              toast.info('Directory Refreshed', 'User directory synchronized with database.');
            }}
            disabled={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="h-9 px-3.5 border-white/[0.08] hover:border-white/[0.15]"
          >
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIsMassAddModalOpen(true); setCsvText(''); setCsvPreview([]); setCsvErrors([]); setMassAddResult(null); }}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
            className="h-9 px-3.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
          >
            Import CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={openAddModal}
            leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            className="h-9 px-3.5 bg-purple-600 hover:bg-purple-500 border border-purple-400/30 shadow-md shadow-purple-600/20"
          >
            Add Student / Faculty
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {(['ALL', 'STUDENT', 'FACULTY', 'ADMIN'] as const).map((r) => {
              const count =
                r === 'ALL'
                  ? users.length
                  : users.filter((u) => u.role === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 shrink-0 ${
                    roleFilter === r
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                  }`}
                >
                  <span>
                    {r === 'ALL'
                      ? 'All Roles'
                      : r === 'FACULTY'
                      ? 'Faculty'
                      : `${r.charAt(0) + r.slice(1).toLowerCase()}s`}
                  </span>
                  <span className="text-[10px] font-mono opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, ID, RFID..."
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
            <Button type="submit" size="sm" variant="secondary">
              Search
            </Button>
          </form>
        </div>
      </div>

      {/* Mass-select Action Ribbon */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-rose-300">
            <CheckSquare className="w-4 h-4" />
            <span className="font-semibold">{selectedIds.size}</span>
            <span className="text-rose-400">user{selectedIds.size > 1 ? 's' : ''} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05] transition"
            >
              Clear
            </button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => { setMassDeleteResult(null); setIsMassDeleteModalOpen(true); }}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="h-8 px-3"
            >
              Delete Selected ({selectedIds.size})
            </Button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01] text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4 w-10">
                  <button
                    onClick={toggleSelectAll}
                    className="text-slate-400 hover:text-white transition"
                    title={selectedIds.size === users.length && users.length > 0 ? 'Deselect all' : 'Select all'}
                  >
                    {selectedIds.size === users.length && users.length > 0 ? (
                      <CheckSquare className="w-4 h-4 text-purple-400" />
                    ) : selectedIds.size > 0 ? (
                      <Minus className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-4 font-medium">User & Name</th>
                <th className="py-3 px-4 font-medium">Role</th>
                <th className="py-3 px-4 font-medium">Institutional / Student ID</th>
                <th className="py-3 px-4 font-medium">RFID UID</th>
                <th className="py-3 px-4 font-medium">Department</th>
                <th className="py-3 px-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr
                    key={u.id}
                    className={`hover:bg-white/[0.02] transition ${selectedIds.has(u.id) ? 'bg-purple-500/5' : ''}`}
                  >
                    <td className="py-3 px-4 align-middle w-10">
                      <button
                        onClick={() => toggleSelectOne(u.id)}
                        className="text-slate-500 hover:text-purple-400 transition"
                      >
                        {selectedIds.has(u.id) ? (
                          <CheckSquare className="w-4 h-4 text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              : u.role === 'FACULTY'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {u.firstName?.[0] || '?'}{u.lastName?.[0] || ''}
                        </div>
                        <div>
                          <div className="font-medium text-slate-200">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 align-middle">
                      <span
                        className={`inline-block font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                          u.role === 'ADMIN'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                            : u.role === 'FACULTY'
                            ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 align-middle">
                      {u.studentId || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4 font-mono align-middle">
                      {u.rfidUid ? (
                        <span className="text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                          0x{u.rfidUid}
                        </span>
                      ) : (
                        <span className="text-slate-600 italic">Unbound</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400 align-middle">{u.department || 'CCS'}</td>
                    <td className="py-3 px-4 text-right align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditModal(u)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-slate-300 hover:text-white transition flex items-center gap-1 text-[11px]"
                          title="Edit User"
                        >
                          <Edit2 className="w-3 h-3 text-slate-400" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => openDeleteModal(u)}
                          className="p-1.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/15 border border-rose-500/10 hover:border-rose-500/30 text-rose-400 hover:text-rose-300 transition"
                          title="Delete User"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddModalOpen} onClose={closeModals} title="Register New User" hideFooter>
        <form onSubmit={handleCreateUser} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">System Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value as any;
                  setFormData({ ...formData, role: newRole });
                  startHardwareEnrollment(newRole, `${formData.firstName} ${formData.lastName}`.trim());
                }}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty Instructor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {formData.role === 'STUDENT' ? 'Student ID Number *' : 'Institutional / Faculty ID *'}
              </label>
              <input
                type="text"
                placeholder={formData.role === 'STUDENT' ? '2023-0001-CCS' : 'FAC-2026-001'}
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
          </div>

          {/* Live Hardware RFID Enrollment Session Module */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-xs font-bold text-purple-300">
                  HARDWARE ENROLLMENT SCANNER ACTIVE
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {terminalId}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/80 border border-white/[0.05] text-[11px] text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Target Role:</span>{' '}
                <strong className="text-white font-mono uppercase">{formData.role}</strong>
              </div>
              <div className="font-mono text-[10px] text-sky-400">
                OLED: [ ADMIN ENROLL ]
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tap physical RFID badge at terminal <strong>{terminalId}</strong>. The badge UID is intercepted live and automatically populated below.
            </p>

            {scannedIntercept && (
              <div
                className={`p-2.5 rounded-lg text-xs border flex items-center gap-2.5 ${
                  scannedIntercept.isRegistered
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div>
                    Live Badge Intercepted: <strong className="font-mono">0x{scannedIntercept.uid}</strong>
                  </div>
                  {scannedIntercept.isRegistered && (
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Notice: Currently mapped to {scannedIntercept.holderName || 'another user'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {formData.role === 'STUDENT' ? (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">RFID UID (Hex)</label>
              <input
                type="text"
                placeholder="Awaiting physical tap..."
                value={formData.rfidUid}
                onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>Students authenticate exclusively via physical RFID card tap or Keypad PIN (no password needed).</span>
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">RFID UID (Hex)</label>
                <input
                  type="text"
                  placeholder="Awaiting physical tap..."
                  value={formData.rfidUid}
                  onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={closeModals}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Registering...' : 'Register User'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={closeModals} title="Edit User Profile" hideFooter>
        <form onSubmit={handleUpdateUser} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => {
                  const newRole = e.target.value as any;
                  setFormData({ ...formData, role: newRole });
                  startHardwareEnrollment(newRole, `${formData.firstName} ${formData.lastName}`.trim());
                }}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty Instructor</option>
                <option value="ADMIN">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {formData.role === 'STUDENT' ? 'Student ID Number *' : 'Institutional / Faculty ID *'}
              </label>
              <input
                type="text"
                placeholder={formData.role === 'STUDENT' ? '2023-0001-CCS' : 'FAC-2026-001'}
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
          </div>

          {/* Live Hardware RFID Enrollment Session Module in Edit */}
          <div className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/25 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono text-xs font-bold text-purple-300">
                  HARDWARE ENROLLMENT SCANNER ACTIVE
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {terminalId}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-950/80 border border-white/[0.05] text-[11px] text-slate-300 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Target Role:</span>{' '}
                <strong className="text-white font-mono uppercase">{formData.role}</strong>
              </div>
              <div className="font-mono text-[10px] text-sky-400">
                OLED: [ ADMIN ENROLL ]
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tap physical RFID badge at terminal <strong>{terminalId}</strong> to capture and update UID.
            </p>

            {scannedIntercept && (
              <div
                className={`p-2.5 rounded-lg text-xs border flex items-center gap-2.5 ${
                  scannedIntercept.isRegistered
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div className="min-w-0">
                  <div>
                    Live Badge Intercepted: <strong className="font-mono">0x{scannedIntercept.uid}</strong>
                  </div>
                  {scannedIntercept.isRegistered && (
                    <div className="text-[10px] opacity-80 mt-0.5">
                      Notice: Currently mapped to {scannedIntercept.holderName || 'another user'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">RFID UID</label>
              <input
                type="text"
                placeholder="Leave blank to unbind"
                value={formData.rfidUid}
                onChange={(e) => setFormData({ ...formData, rfidUid: e.target.value.toUpperCase() })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">New Password (Optional)</label>
              <input
                type="password"
                placeholder="Leave blank to keep"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button type="button" variant="outline" size="sm" onClick={closeModals}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete User Confirmation */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" hideFooter>
        <div className="space-y-4">
          {/* User identity card */}
          <div className="p-3 rounded-xl bg-slate-950/80 border border-white/[0.06] flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                selectedUser?.role === 'ADMIN'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : selectedUser?.role === 'FACULTY'
                  ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {selectedUser?.firstName?.[0]}{selectedUser?.lastName?.[0]}
            </div>
            <div>
              <div className="font-medium text-white text-sm">
                {selectedUser?.firstName} {selectedUser?.lastName}
              </div>
              <div className="text-[11px] text-slate-400">{selectedUser?.email}</div>
              {selectedUser?.studentId && (
                <div className="text-[11px] text-slate-500 font-mono mt-0.5">{selectedUser.studentId}</div>
              )}
            </div>
            <span
              className={`ml-auto inline-block font-mono text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                selectedUser?.role === 'ADMIN'
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                  : selectedUser?.role === 'FACULTY'
                  ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
              }`}
            >
              {selectedUser?.role}
            </span>
          </div>

          {/* Impact warning */}
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>Permanent Action</span>
            </div>
            <p className="text-[11px] text-rose-300/80 leading-relaxed">
              This will permanently remove the user and all associated data including enrollment records, attendance logs, and OTP codes. This action cannot be undone.
            </p>
            {selectedUser?._count && (selectedUser._count.enrollments > 0 || selectedUser._count.sectionsTaught > 0) && (
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUser._count.enrollments > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/25 text-rose-300">
                    {selectedUser._count.enrollments} enrollment{selectedUser._count.enrollments > 1 ? 's' : ''}
                  </span>
                )}
                {selectedUser._count.sectionsTaught > 0 && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 text-amber-300">
                    {selectedUser._count.sectionsTaught} section{selectedUser._count.sectionsTaught > 1 ? 's' : ''} taught
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete User Permanently'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Mass Delete Confirmation Modal ─────────────────────────── */}
      <Modal isOpen={isMassDeleteModalOpen} onClose={() => setIsMassDeleteModalOpen(false)} title={`Delete ${selectedIds.size} User${selectedIds.size > 1 ? 's' : ''}`} hideFooter>
        <div className="space-y-4">
          {!massDeleteResult ? (
            <>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Mass Delete — {selectedIds.size} user{selectedIds.size > 1 ? 's' : ''} selected</span>
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed">
                  All selected <strong>student</strong> accounts will be permanently deleted along with their enrollment records, attendance logs, and OTP codes.
                  Faculty/Admin accounts that own sections or sessions will be <strong>skipped</strong> automatically.
                </p>
              </div>
              {/* Preview list */}
              <div className="max-h-48 overflow-y-auto rounded-xl border border-white/[0.06] divide-y divide-white/[0.04]">
                {users.filter((u) => selectedIds.has(u.id)).map((u) => (
                  <div key={u.id} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                      u.role === 'ADMIN' ? 'bg-purple-500/15 text-purple-300' :
                      u.role === 'FACULTY' ? 'bg-blue-500/15 text-blue-300' :
                      'bg-emerald-500/15 text-emerald-300'}`}
                    >
                      {u.firstName[0]}{u.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-200 truncate">{u.firstName} {u.lastName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{u.email}</div>
                    </div>
                    <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                      u.role === 'FACULTY' || u.role === 'ADMIN'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <Button variant="outline" size="sm" onClick={() => setIsMassDeleteModalOpen(false)}>Cancel</Button>
                <Button variant="danger" size="sm" onClick={handleMassDelete} disabled={isSubmitting}>
                  {isSubmitting ? 'Deleting...' : `Delete ${selectedIds.size} User${selectedIds.size > 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Result view */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{massDeleteResult.deleted} deleted</div>
                    {massDeleteResult.skipped.length > 0 && (
                      <div className="text-xs text-amber-400">{massDeleteResult.skipped.length} skipped</div>
                    )}
                  </div>
                </div>
                {massDeleteResult.skipped.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                    <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Skipped (have active sections/sessions)
                    </div>
                    {massDeleteResult.skipped.map((s, i) => (
                      <div key={i} className="text-[11px] text-amber-300/80">• {s.name} — {s.reason}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-2 border-t border-white/[0.06]">
                <Button variant="outline" size="sm" onClick={() => { setIsMassDeleteModalOpen(false); setMassDeleteResult(null); }}>Close</Button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ── Mass Add (CSV Import) Modal ─────────────────────────────── */}
      <Modal isOpen={isMassAddModalOpen} onClose={() => setIsMassAddModalOpen(false)} title="Import Users from CSV" hideFooter>
        <div className="space-y-4">
          {!massAddResult ? (
            <>
              {/* Template download + file upload */}
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template CSV
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] text-xs transition cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Upload CSV File
                  <input ref={csvFileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvFile} />
                </label>
              </div>

              {/* Column reference */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-white/[0.05]">
                <div className="text-[10px] font-mono text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Required columns</div>
                <div className="flex flex-wrap gap-1.5">
                  {['firstName*', 'lastName*', 'email*', 'studentId', 'rfidUid', 'department', 'role', 'password'].map((c) => (
                    <span key={c} className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${c.endsWith('*') ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06]'}`}>
                      {c}
                    </span>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">role defaults to <span className="font-mono">STUDENT</span>; password defaults to <span className="font-mono">StudentPass123!</span></p>
              </div>

              {/* Paste area */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Paste CSV contents</label>
                <textarea
                  rows={6}
                  value={csvText}
                  onChange={(e) => handleCsvTextChange(e.target.value)}
                  placeholder={'firstName,lastName,email,studentId,...\nJuan,dela Cruz,juan@school.edu,2024-0001,...'}
                  className="w-full bg-slate-950 border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-500/40 resize-none"
                />
              </div>

              {/* Parse errors */}
              {csvErrors.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <div className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Parse Errors
                  </div>
                  {csvErrors.map((e, i) => <div key={i} className="text-[11px] text-rose-300/80">• {e}</div>)}
                </div>
              )}

              {/* Preview table */}
              {csvPreview.length > 0 && (
                <div>
                  <div className="text-xs text-slate-400 mb-1.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{csvPreview.length} valid row{csvPreview.length > 1 ? 's' : ''} ready to import</span>
                  </div>
                  <div className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.06]">
                    <table className="w-full text-[11px] text-left">
                      <thead className="sticky top-0 bg-slate-900 border-b border-white/[0.05]">
                        <tr className="text-slate-500 font-mono text-[10px]">
                          <th className="px-3 py-1.5">#</th>
                          <th className="px-3 py-1.5">Name</th>
                          <th className="px-3 py-1.5">Email</th>
                          <th className="px-3 py-1.5">Student ID</th>
                          <th className="px-3 py-1.5">Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="hover:bg-white/[0.02]">
                            <td className="px-3 py-1.5 text-slate-600 font-mono">{i + 1}</td>
                            <td className="px-3 py-1.5 text-slate-200">{row.firstName} {row.lastName}</td>
                            <td className="px-3 py-1.5 text-slate-400 truncate max-w-[140px]">{row.email}</td>
                            <td className="px-3 py-1.5 font-mono text-slate-500">{row.studentId || '—'}</td>
                            <td className="px-3 py-1.5">
                              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${
                                row.role === 'FACULTY' ? 'bg-blue-500/10 text-blue-300' :
                                row.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-300' :
                                'bg-emerald-500/10 text-emerald-300'}`}>
                                {row.role}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <Button variant="outline" size="sm" onClick={() => setIsMassAddModalOpen(false)}>Cancel</Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleMassAdd}
                  disabled={isSubmitting || csvPreview.length === 0}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                  className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400/30"
                >
                  {isSubmitting ? 'Importing...' : `Import ${csvPreview.length} User${csvPreview.length !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          ) : (
            /* Results view after import */
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-950/80 border border-white/[0.06]">
                <div className="text-center">
                  <div className="text-2xl font-bold text-emerald-400">{massAddResult.created}</div>
                  <div className="text-[10px] text-slate-500">Created</div>
                </div>
                <div className="w-px h-10 bg-white/[0.06]" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-rose-400">{massAddResult.failed}</div>
                  <div className="text-[10px] text-slate-500">Failed</div>
                </div>
              </div>
              {massAddResult.failed > 0 && (
                <div className="max-h-44 overflow-y-auto rounded-xl border border-white/[0.06] divide-y divide-white/[0.04]">
                  {massAddResult.results.filter((r) => !r.success).map((r) => (
                    <div key={r.row} className="flex items-start gap-2 px-3 py-2 text-[11px]">
                      <span className="font-mono text-slate-600 shrink-0">Row {r.row}</span>
                      <span className="text-slate-400 truncate">{r.email}</span>
                      <span className="ml-auto text-rose-400 shrink-0">{r.message}</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.06]">
                <Button variant="outline" size="sm" onClick={() => { setMassAddResult(null); setCsvText(''); setCsvPreview([]); }}>
                  Import More
                </Button>
                <Button variant="primary" size="sm" onClick={() => setIsMassAddModalOpen(false)}>Done</Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

