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
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 rounded-xl shadow-sm shadow-emerald-500/10">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-base tracking-wider text-hud-text">
                  ORCHESTRA
                </span>
                <span className="text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  TRUST MATRIX
                </span>
              </div>
              <p className="hidden md:block text-xs text-hud-secondary">
                RFID Session Attendance Framework
              </p>
            </div>
          </div>

          {/* Clean Segmented Navigation Tabs */}
          <nav className="flex items-center p-1 bg-hud-surface border border-hud-border/60 rounded-xl">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'dashboard'
                  ? 'bg-hud-elevated text-white shadow-sm font-semibold'
                  : 'text-hud-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Faculty Console</span>
            </button>

            <button
              onClick={() => onSelectTab('otp')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'otp'
                  ? 'bg-hud-elevated text-white shadow-sm font-semibold'
                  : 'text-hud-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Keypad OTP</span>
            </button>

            <button
              onClick={() => onSelectTab('terminal')}
              className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
                currentTab === 'terminal'
                  ? 'bg-hud-elevated text-white shadow-sm font-semibold'
                  : 'text-hud-secondary hover:text-white hover:bg-white/5'
              }`}
            >
              <Terminal className="w-4 h-4 text-slate-300" />
              <span>Edge Diagnostics</span>
            </button>
          </nav>

          {/* Terminal Node & Status */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 text-xs bg-hud-surface border border-hud-border/60 px-3 py-1.5 rounded-xl">
              <span className="text-hud-muted text-[11px] font-mono">NODE:</span>
              <span className="font-mono font-medium text-emerald-400">{terminalId}</span>
              <CopyButton text={terminalId} label="" className="p-0 ml-0.5 text-hud-muted hover:text-emerald-400" />
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 text-xs bg-hud-surface border border-hud-border/60 rounded-xl">
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span className="font-medium text-slate-300">{isConnected ? 'Online' : 'Reconnecting'}</span>
            </div>

            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 border border-hud-border/60 bg-hud-surface text-hud-secondary hover:text-white hover:bg-hud-elevated rounded-xl transition-colors"
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
