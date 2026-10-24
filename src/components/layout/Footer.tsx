import React from 'react';
import { Cpu, Database, Network, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-hud-surface border-t border-hud-border py-6 font-mono text-xs text-hud-muted">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-hud-text font-medium text-xs tracking-wider">
              <ShieldCheck className="w-4 h-4 text-hud-lime" />
              <span className="font-sans font-bold">ORCHESTRA Framework</span>
              <span className="text-hud-muted font-mono">•</span>
              <span className="text-hud-secondary font-normal text-[11px]">
                College of Computer Studies · Computer Architecture &amp; Organization
              </span>
            </div>
            <p className="text-[11px] text-hud-muted mt-1">
              Authored: Agbada, Altichie, Cabunoc, Dalupang, Macadat, Malate (Published: 2026-10-24)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-hud-secondary">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-hud-lime" />
              <span>ESP32 SoC (PlatformIO v6.1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-hud-muted" />
              <span>Neon PostgreSQL v16 (AWS ap-southeast-1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-hud-amber" />
              <span>Carrier: 13.56 MHz (SPI Verified via Saleae Logic 8)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
