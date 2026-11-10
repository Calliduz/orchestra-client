import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Search, Edit2, Trash2, Shield, CreditCard, CheckCircle2, AlertCircle, RefreshCw, X, Radio, Sparkles } from 'lucide-react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { Badge } from '../../components/ui/Badge.js';
import { Modal } from '../../components/ui/Modal.js';
import { API_V1_URL } from '../../config/api.js';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
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

export const AdminUsersPage: React.FC = () => {
  const { token } = useAuth();
  const { socket, isConnected, terminalId } = useSocket();
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

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

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
          Authorization: `Bearer ${token}`,
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
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ terminalId }),
      });
    } catch (err) {
      console.warn('Failed to stop hardware enrollment mode:', err);
    }
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setIsDeleteModalOpen(false);
    stopHardwareEnrollment();
  };

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
        headers: { Authorization: `Bearer ${token}` },
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
          Authorization: `Bearer ${token}`,
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
    } catch (err: any) {
      setFormError(err.message);
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
          Authorization: `Bearer ${token}`,
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
    } catch (err: any) {
      setFormError(err.message);
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
        headers: { Authorization: `Bearer ${token}` },
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || 'Failed to delete user');
      }

      setIsDeleteModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      alert(err.message);
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
            <Users className="w-5 h-5 text-purple-400" />
            <span>User & Enrollment Directory</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Centrally manage students, faculty instructors, roles, credentials, and RFID cards
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchUsers} disabled={isLoading} className="gap-2">
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
          <Button variant="primary" size="sm" onClick={openAddModal} className="gap-2 bg-purple-600 hover:bg-purple-500">
            <UserPlus className="w-4 h-4" />
            <span>Add Student / Faculty</span>
          </Button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/[0.06] backdrop-blur-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0">
            {(['ALL', 'STUDENT', 'FACULTY', 'ADMIN'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  roleFilter === r
                    ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : `${r.charAt(0) + r.slice(1).toLowerCase()}s`}
              </button>
            ))}
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

      {/* Users Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-white/[0.06] overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/[0.05] bg-white/[0.01] text-slate-400 font-mono text-[11px] uppercase">
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
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No users matching criteria
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4 align-middle">
                      <div className="font-medium text-slate-200">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-[11px] text-slate-400">{u.email}</div>
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
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 hover:bg-white/[0.05] text-slate-400 hover:text-slate-200 rounded-lg transition"
                          title="Edit User"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(u)}
                          className="p-1.5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 rounded-lg transition"
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Student / Employee ID</label>
              <input
                type="text"
                placeholder="2023-0001-CCS"
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
              <label className="block text-xs font-medium text-slate-300 mb-1">Student / Employee ID</label>
              <input
                type="text"
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
          <p className="text-xs text-slate-300">
            Are you sure you want to permanently delete{' '}
            <strong className="text-white">
              {selectedUser?.firstName} {selectedUser?.lastName}
            </strong>{' '}
            ({selectedUser?.email})? All associated enrollment records will be removed.
          </p>
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-white/[0.06]">
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteUser} disabled={isSubmitting}>
              {isSubmitting ? 'Deleting...' : 'Delete User'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

