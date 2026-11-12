import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  CalendarCheck,
  KeyRound,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { SkipLink } from './SkipLink.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.js';
import { EmergencyOtpModal } from '../dashboard/EmergencyOtpModal.js';

export const StudentLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    toast.info('Signed Out', 'You have been logged out of Orchestra.');
    navigate('/login');
  };

  const navLinks = [
    {
      to: '/student/attendance',
      label: 'My Attendance',
      desc: 'Ledger & Punctuality Records',
      icon: CalendarCheck,
    },
  ];

  return (
    <>
      <SkipLink />
      <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col md:flex-row">
        {/* Mobile Header Bar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-950 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ORCHESTRA</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                  STUDENT
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Sidebar - Desktop & Mobile Drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-950 border-r border-white/[0.05] flex flex-col shrink-0 h-screen max-h-screen overflow-hidden justify-between select-none transition-transform duration-200 md:static md:translate-x-0 ${
            isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <div className="flex flex-col min-h-0 overflow-hidden">
            {/* Desktop Brand Header */}
            <div className="p-4 border-b border-white/[0.05] hidden md:flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600/15 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span>ORCHESTRA</span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                    STUDENT
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">Academic Ingress Matrix</div>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-2.5 flex-1 min-h-0 overflow-y-auto space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-mono tracking-wider text-slate-400 uppercase">
                Student Portal
              </div>
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors min-h-[44px] ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-300 font-semibold border border-emerald-500/20'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <div>
                        <div>{item.label}</div>
                        <div className="text-[10px] text-slate-500 group-hover:text-slate-400">
                          {item.desc}
                        </div>
                      </div>
                    </div>
                  </NavLink>
                );
              })}

              {/* Quick Action: Emergency Keypad PIN Trigger */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsOtpModalOpen(true);
                }}
                className="w-full group flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors min-h-[44px] text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20"
              >
                <div className="flex items-center gap-2.5">
                  <KeyRound className="w-4 h-4 shrink-0 text-amber-400" />
                  <div className="text-left">
                    <div className="font-semibold">Emergency PIN</div>
                    <div className="text-[10px] text-amber-400/70">60-second keypad token</div>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </nav>
          </div>

          {/* Student Identity Bar & Logout */}
          <div className="p-2.5 border-t border-white/[0.05] bg-slate-950/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden min-w-0">
                <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/25 flex items-center justify-center text-xs font-bold text-emerald-300 shrink-0">
                  {user?.firstName?.[0] || 'S'}
                </div>
                <div className="truncate text-xs min-w-0">
                  <div className="font-medium text-slate-200 truncate">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-[10px] font-mono text-emerald-400/90 truncate">
                    {user?.studentId || user?.email}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0 ml-1 min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Sign out of Orchestra"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile backdrop */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Main Content Area */}
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 overflow-y-auto min-w-0 h-screen focus:outline-none"
        >
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      {/* Global Emergency OTP Modal */}
      <EmergencyOtpModal
        isOpen={isOtpModalOpen}
        onClose={() => setIsOtpModalOpen(false)}
      />
    </>
  );
};

export default StudentLayout;
