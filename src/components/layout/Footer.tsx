import React from 'react';
import { Cpu, Database, Network } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-hud-surface border-t border-hud-border py-6 font-mono text-xs text-hud-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-hud-text font-medium text-xs tracking-wider">
              <img
                src="/orchestra-plain-bgrmvd-vectorized.svg"
                alt="ORCHESTRA Official Logo"
                className="w-5 h-5 object-contain"
              />
              <span className="font-sans font-extrabold tracking-wide">ORCHESTRA Framework</span>
              <span className="text-hud-muted font-mono">•</span>
              <span className="text-hud-secondary font-body font-normal text-xs">
                College of Computer Studies · Department of Computer Science &amp; IT
              </span>
            </div>
            <p className="text-[11px] text-hud-muted font-body mt-1">
              Academic Telemetry Framework: Agbada, Altichie, Cabunoc, Dalupang, Macadat, Malate
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-hud-secondary">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-sky-400" />
              <span>ESP32 Node (SPI MFRC522)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>PostgreSQL Roster Engine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-amber-400" />
              <span>NFC/RFID: 13.56 MHz ISO14443A</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
