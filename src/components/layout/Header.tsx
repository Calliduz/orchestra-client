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
  terminalState = 'LOCKED',
  sectionCode = 'AR101-BSIT3A',
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
    <header className="sticky top-0 z-40 w-full bg-hud-bg/95 backdrop-blur-md border-b border-hud-border">
      {/* Precision Telemetry Hairline Ticker */}
      <div className="w-full bg-hud-surface border-b border-hud-subtle px-4 sm:px-6 py-1 flex items-center justify-between text-[10px] font-mono text-hud-secondary select-none overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-hud-lime animate-pulse" />
            <span className="text-hud-lime font-bold">BUS INTERLOCK ACTIVE</span>
          </div>
          <span className="text-hud-muted">•</span>
          <span>SPI CARRIER: 13.56 MHz (ISO/IEC 14443A)</span>
          <span className="text-hud-muted">•</span>
          <span>PACING DELAY: 3000 ms</span>
          <span className="text-hud-muted">•</span>
          <span>I2C OLED: 0x3C</span>
          <span className="text-hud-muted">•</span>
          <span>ENGINE: NEON POSTGRESQL</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>LOCAL CLOCK: <span className="font-bold text-hud-text num-tabular">{currentTime || '00:00:00'}</span></span>
          <span className="text-hud-muted">|</span>
          <span className="text-hud-secondary font-medium">ORCHESTRA v1.0.4</span>
        </div>
      </div>

      {/* Main Command Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-hud-elevated border border-hud-border flex items-center justify-center text-hud-lime rounded-sm shadow-[0_0_10px_rgba(204,255,0,0.12)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-bold text-sm tracking-widest text-hud-text uppercase">
                  ORCHESTRA
                </span>
                <span className="text-[9px] font-mono font-semibold bg-hud-lime-bg text-hud-lime border border-hud-lime-border px-1.5 py-0.2 rounded-sm">
                  HARDWARE TRUST
                </span>
              </div>
              <p className="hidden md:block font-mono text-[10px] text-hud-secondary tracking-tight">
                RFID Ingress Framework · Terminal <span className="text-hud-text font-medium">{terminalId}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all border rounded-sm ${
                currentTab === 'dashboard'
                  ? 'bg-hud-lime-bg text-hud-lime border-hud-lime-border shadow-[0_0_10px_rgba(204,255,0,0.1)]'
                  : 'bg-transparent text-hud-secondary border-transparent hover:border-hud-border hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Faculty Console</span>
            </button>

            <button
              onClick={() => onSelectTab('otp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all border rounded-sm ${
                currentTab === 'otp'
                  ? 'bg-hud-lime-bg text-hud-lime border-hud-lime-border shadow-[0_0_10px_rgba(204,255,0,0.1)]'
                  : 'bg-transparent text-hud-secondary border-transparent hover:border-hud-border hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Keypad OTP</span>
            </button>

            <button
              onClick={() => onSelectTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all border rounded-sm ${
                currentTab === 'terminal'
                  ? 'bg-hud-lime-bg text-hud-lime border-hud-lime-border shadow-[0_0_10px_rgba(204,255,0,0.1)]'
                  : 'bg-transparent text-hud-secondary border-transparent hover:border-hud-border hover:text-hud-text hover:bg-hud-hover'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Edge Diagnostics</span>
            </button>
          </nav>

          {/* Terminal Node & Socket Connection Status */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] bg-hud-elevated border border-hud-border px-2.5 py-1 text-hud-secondary rounded-sm">
              <span>NODE:</span>
              <span className="text-hud-lime font-bold">{terminalId}</span>
              <CopyButton text={terminalId} label="" className="border-0 bg-transparent p-0 ml-0.5" />
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-semibold border rounded-sm ${
                isConnected
                  ? 'bg-hud-lime-bg text-hud-lime border-hud-lime-border'
                  : 'bg-hud-amber-bg text-hud-amber border-hud-amber-border'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-hud-lime animate-pulse' : 'bg-hud-amber'
                }`}
              />
              <span>{isConnected ? 'ONLINE' : 'RECONNECTING'}</span>
            </div>

            <button
              onClick={toggleTheme}
              aria-label="Toggle visual mode"
              className="p-1.5 border border-hud-border bg-hud-elevated text-hud-secondary hover:text-hud-lime hover:border-hud-lime rounded-sm transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
