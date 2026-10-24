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
    <header className="sticky top-0 z-40 w-full bg-[#080A0D]/95 backdrop-blur-md border-b border-[#1E2632]">
      {/* Precision Telemetry Hairline Ticker */}
      <div className="w-full bg-[#0B0E12] border-b border-[#161D26] px-4 sm:px-6 py-1 flex items-center justify-between text-[10px] font-mono text-[#7E8B9B] select-none overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#CCFF00] animate-pulse" />
            <span className="text-[#CCFF00] font-bold">BUS INTERLOCK ACTIVE</span>
          </div>
          <span className="text-[#364252]">•</span>
          <span>SPI CARRIER: 13.56 MHz (ISO/IEC 14443A)</span>
          <span className="text-[#364252]">•</span>
          <span>PACING DELAY: 3000 ms</span>
          <span className="text-[#364252]">•</span>
          <span>I2C OLED: 0x3C</span>
          <span className="text-[#364252]">•</span>
          <span>ENGINE: NEON POSTGRESQL</span>
        </div>
        <div className="hidden sm:flex items-center gap-4">
          <span>LOCAL CLOCK: <span className="font-bold text-[#E2E8F0] num-tabular">{currentTime || '00:00:00'}</span></span>
          <span className="text-[#364252]">|</span>
          <span className="text-[#94A3B8]">ORCHESTRA v1.0.4</span>
        </div>
      </div>

      {/* Main Command Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Brand Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-none bg-[#11161F] border border-[#232D3B] flex items-center justify-center text-[#CCFF00] shadow-[0_0_8px_rgba(204,255,0,0.15)]">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-sans font-black text-sm tracking-widest text-[#F1F5F9] uppercase">
                  ORCHESTRA
                </span>
                <span className="text-[9px] font-mono font-semibold bg-[#162309] text-[#CCFF00] border border-[#2F4613] px-1.5 py-0.2">
                  HARDWARE TRUST
                </span>
              </div>
              <p className="hidden md:block font-mono text-[10px] text-[#7E8B9B] tracking-tight">
                RFID Ingress Framework · Terminal <span className="text-[#CBD5E1]">{terminalId}</span>
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all border ${
                currentTab === 'dashboard'
                  ? 'bg-[#15200A] text-[#CCFF00] border-[#395316] shadow-[0_0_10px_rgba(204,255,0,0.12)]'
                  : 'bg-transparent text-[#7E8B9B] border-transparent hover:border-[#222C3B] hover:text-[#E2E8F0]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Faculty Console</span>
            </button>

            <button
              onClick={() => onSelectTab('otp')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all border ${
                currentTab === 'otp'
                  ? 'bg-[#15200A] text-[#CCFF00] border-[#395316] shadow-[0_0_10px_rgba(204,255,0,0.12)]'
                  : 'bg-transparent text-[#7E8B9B] border-transparent hover:border-[#222C3B] hover:text-[#E2E8F0]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Keypad OTP</span>
            </button>

            <button
              onClick={() => onSelectTab('terminal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider transition-all border ${
                currentTab === 'terminal'
                  ? 'bg-[#15200A] text-[#CCFF00] border-[#395316] shadow-[0_0_10px_rgba(204,255,0,0.12)]'
                  : 'bg-transparent text-[#7E8B9B] border-transparent hover:border-[#222C3B] hover:text-[#E2E8F0]'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Edge Diagnostics</span>
            </button>
          </nav>

          {/* Terminal Node & Socket Connection Status */}
          <div className="flex items-center gap-2.5">
            <div className="hidden lg:flex items-center gap-1.5 font-mono text-[10px] bg-[#0E131A] border border-[#1E2632] px-2.5 py-1 text-[#7E8B9B]">
              <span>NODE:</span>
              <span className="text-[#CCFF00] font-bold">{terminalId}</span>
              <CopyButton text={terminalId} label="" className="border-0 bg-transparent p-0 ml-0.5" />
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold border ${
                isConnected
                  ? 'bg-[#112209] text-[#CCFF00] border-[#29420D]'
                  : 'bg-[#241303] text-[#F59E0B] border-[#522E06]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected ? 'bg-[#CCFF00] animate-pulse' : 'bg-[#F59E0B]'
                }`}
              />
              <span>{isConnected ? 'ONLINE' : 'RECONNECTING'}</span>
            </div>

            <button
              onClick={toggleTheme}
              aria-label="Toggle visual mode"
              className="p-1.5 border border-[#1E2632] bg-[#0E131A] text-[#7E8B9B] hover:text-[#CCFF00] hover:border-[#CCFF00] transition-colors"
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
