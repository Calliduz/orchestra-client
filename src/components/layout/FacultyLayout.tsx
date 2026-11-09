import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutGrid, Radio, FileText, BarChart3, Users, LogOut, GraduationCap, ChevronRight, Shield, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { useSocket } from '../../context/SocketContext.js';

export const FacultyLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { isConnected, terminalId, socket } = useSocket();
  const navigate = useNavigate();
  const [hasActiveSession, setHasActiveSession] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleStarted = () => setHasActiveSession(true);
    const handleClosed = () => setHasActiveSession(false);
    socket.on('session:started', handleStarted);
    socket.on('session:closed', handleClosed);
    return () => {
      socket.off('session:started', handleStarted);
      socket.off('session:closed', handleClosed);
    };
  }, [socket]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/faculty', end: true, label: 'My Classrooms', icon: LayoutGrid, desc: 'Courses & Ingress Status' },
    { to: '/faculty/live', label: 'Live Session', icon: Radio, desc: 'Real-time Taps & Thresholds', isLiveBadge: true },
    { to: '/faculty/reports', label: 'Attendance Reports', icon: FileText, desc: 'Excel, PDF, CSV & Email' },
    { to: '/faculty/analytics', label: 'Analytics & Graphs', icon: BarChart3, desc: 'Punctuality & Trends' },
    { to: '/faculty/students', label: 'Enrolled Students', icon: Users, desc: 'Roster & Overall Rates' },
  ];

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar - Fixed & Never Scrollable */}
      <aside className="w-full md:w-64 bg-slate-950 border-r border-white/[0.05] flex flex-col shrink-0 md:h-screen md:max-h-screen overflow-hidden justify-between select-none">
        <div className="flex flex-col min-h-0 overflow-hidden">
          {/* Brand */}
          <div className="p-4 border-b border-white/[0.05] flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                <span>ORCHESTRA</span>
                <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                  FACULTY
                </span>
              </div>
              <div className="text-[11px] text-slate-400">Instructor Console</div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-2.5 flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-0.5">
            <div className="px-3 py-1.5 text-[10px] font-mono tracking-wider text-slate-400 uppercase">
              Classroom Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all group ${
                      isActive
                        ? 'bg-blue-600/10 text-blue-300 border border-blue-500/20 shadow-xs'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
                    }`
                  }
                >
                  <div className="relative">
                    <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                    {item.isLiveBadge && hasActiveSession && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="leading-tight truncate">{item.label}</span>
                      {item.isLiveBadge && hasActiveSession && (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 shrink-0">
                          LIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight truncate">{item.desc}</div>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col shrink-0">
          {/* Terminal Edge Info */}
          <div className="p-2.5 mx-2.5 mb-2 rounded-xl bg-slate-900/40 border border-white/[0.05] text-xs">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="font-mono text-[10px]">ROOM TERMINAL</span>
              <span className="flex items-center gap-1 font-mono text-[10px]">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                {isConnected ? 'SYNCED' : 'OFFLINE'}
              </span>
            </div>
            <div className="text-slate-300 font-mono text-[11px] truncate">{terminalId}</div>
          </div>

          {/* Switch Portal Button for Admins */}
          {user?.role === 'ADMIN' && (
            <div className="px-2.5 pb-2">
              <button
                onClick={() => navigate('/admin/users')}
                className="w-full py-1.5 px-3 rounded-xl bg-purple-600/10 hover:bg-purple-600/15 border border-purple-500/20 text-purple-400 text-xs font-medium flex items-center justify-between group transition"
              >
                <div className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Control Center</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* User bar */}
          <div className="p-2.5 border-t border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden min-w-0">
              <div className="w-7 h-7 rounded-full bg-blue-600/20 border border-blue-500/25 flex items-center justify-center text-xs font-bold text-blue-300 shrink-0">
                {user?.firstName?.[0] || 'P'}
              </div>
              <div className="truncate text-xs min-w-0">
                <div className="font-medium text-slate-200 truncate">
                  {user?.role === 'ADMIN' ? `${user?.firstName} ${user?.lastName}` : `Prof. ${user?.firstName} ${user?.lastName}`}
                </div>
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
      <main className="flex-1 overflow-y-auto min-w-0 h-screen">
        <Outlet />
      </main>
    </div>
  );
};
