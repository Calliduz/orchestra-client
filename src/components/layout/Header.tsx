import React, { useState, useEffect } from 'react';
import { Shield, Moon, Sun, Terminal, KeyRound, Activity } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext.js';
import { useSocket } from '../../context/SocketContext.js';
import { CopyButton } from '../ui/CopyButton.js';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  terminalState?: string;
  sectionCode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
}) => {
  const { theme, toggleTheme } = useTheme();
  const { isConnected, terminalId } = useSocket();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-hud-bg/85 backdrop-blur-xl border-b border-hud-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Brand Identity with Academic Authority */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 rounded-xl shadow-glow-cyan/20">
              <Shield className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-base tracking-wider text-hud-text">
                  ORCHESTRA
                </span>
                <span className="text-[10px] font-sans font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full">
                  ACADEMIC SIGNAL
                </span>
              </div>
              <p className="hidden md:block text-xs text-hud-secondary font-body">
                RFID Session Attendance &amp; Hardware Telemetry
              </p>
            </div>
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <nav className="flex items-center p-1 bg-hud-elevated border border-hud-border/70 rounded-2xl shadow-sm">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-hud-secondary hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span>Faculty Console</span>
            </button>

            <button
              onClick={() => onSelectTab('otp')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                currentTab === 'otp'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-hud-secondary hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-500 dark:text-amber-400" />
              <span>Keypad OTP</span>
            </button>

            <button
              onClick={() => onSelectTab('terminal')}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-xl transition-all ${
                currentTab === 'terminal'
                  ? 'bg-sky-600 text-white shadow-sm font-bold'
                  : 'text-hud-secondary hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <Terminal className="w-4 h-4 text-sky-600 dark:text-sky-300" />
              <span>Edge Diagnostics</span>
            </button>
          </nav>

          {/* Terminal Node & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs bg-hud-surface border border-hud-border/70 px-3 py-1.5 rounded-xl shadow-sm">
              <span className="text-hud-muted text-[11px] font-mono">NODE:</span>
              <span className="font-mono font-medium text-sky-600 dark:text-sky-400">{terminalId}</span>
              <CopyButton text={terminalId} label="" className="p-0 ml-0.5 text-hud-muted hover:text-sky-600 dark:hover:text-sky-400" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-hud-surface border border-hud-border/70 rounded-xl shadow-sm">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                }`}
              />
              <span className="font-semibold text-hud-text">{isConnected ? 'Online' : 'Reconnecting'}</span>
            </div>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 border border-hud-border/70 bg-hud-surface text-hud-secondary hover:text-hud-text hover:bg-hud-hover rounded-xl shadow-sm transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
