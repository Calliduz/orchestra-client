import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Users, BookOpen, UserPlus, CreditCard, Terminal, LogOut, Shield, ChevronRight, GraduationCap, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { useToast } from '../../context/ToastContext.js';
import { SkipLink } from './SkipLink.js';
import { ErrorBoundary } from '../ui/ErrorBoundary.js';

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, terminalId } = useSocket();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.info('Signed Out', 'You have been logged out of Orchestra.');
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/users', label: 'User Directory', icon: Users, desc: 'Students & Faculty CRUD' },
    { to: '/admin/sections', label: 'Sections / Courses', icon: BookOpen, desc: 'Classroom & Threshold Config' },
    { to: '/admin/enrollments', label: 'Enrollments', icon: UserPlus, desc: 'Assign Students to Classes' },
    { to: '/admin/cards', label: 'Badge Provisioning', icon: CreditCard, desc: 'Live RFID Hardware Intercept' },
    { to: '/admin/terminal', label: 'Edge Diagnostics', icon: Terminal, desc: 'ESP32 Virtual Terminal Mirror' },
  ];

  return (
    <>
      <SkipLink />
      <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Fixed & Never Scrollable */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-white/[0.05] flex flex-col shrink-0 md:h-screen md:max-h-screen overflow-hidden justify-between select-none">
        <div className="flex flex-col min-h-0 overflow-hidden">
          {/* Brand */}
          <div className="p-4 border-b border-white/[0.05] flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-600/15 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ORCHESTRA</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20">
                  ADMIN
                </span>
              </div>
              <div className="text-[11px] text-slate-400">System Administration</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-2.5 flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5">
            <div className="px-3 py-1.5 text-[10px] font-mono tracking-wider text-slate-400 uppercase">
              Management Modules
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-purple-600/15 text-purple-300 border border-purple-500/20 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="leading-tight truncate">{item.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col shrink-0">
          {/* Terminal status box */}
          <div className="p-2.5 mx-2.5 mb-2 rounded-xl bg-slate-900/40 border border-white/[0.05] text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-mono text-[10px]">EDGE LINK</span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                {isConnected ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-slate-300 font-mono text-[11px] truncate">{terminalId}</div>
          </div>

          {/* Switch Portal Button */}
          <div className="px-2.5 pb-2">
            <button
              onClick={() => navigate('/faculty')}
              className="w-full py-1.5 px-3 rounded-xl bg-blue-600/10 hover:bg-blue-600/15 border border-blue-500/20 text-blue-400 text-xs font-medium flex items-center justify-between group transition"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>Faculty Portal View</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* User bar */}
          <div className="p-2.5 border-t border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/25 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                {user?.firstName?.[0] || 'A'}
              </div>
              <div className="truncate text-xs min-w-0">
                <div className="font-medium text-slate-200 truncate">{user?.firstName} {user?.lastName}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Smooth Independent Scroll */}
      <main id="main-content" tabIndex={-1} className="flex-1 overflow-y-auto min-w-0 h-screen focus:outline-none">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  </>
  );
};

