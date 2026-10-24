import React from 'react';
import { Cpu, Database, Network, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-[#080A0D] border-t border-[#1E2632] py-6 font-mono text-xs text-[#7E8B9B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#F1F5F9] font-medium text-xs tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#CCFF00]" />
              <span className="font-sans font-bold">ORCHESTRA Framework</span>
              <span className="text-[#3E4A5B] font-mono">•</span>
              <span className="text-[#8C98A8] font-normal text-[11px]">
                College of Computer Studies · Computer Architecture &amp; Organization
              </span>
            </div>
            <p className="text-[11px] text-[#6A7888] mt-1">
              Authored: Agbada, Altichie, Cabunoc, Dalupang, Macadat, Malate (Published: 2026-10-24)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#7E8B9B]">
            <div className="flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#CCFF00]" />
              <span>ESP32 SoC (PlatformIO v6.1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Neon PostgreSQL v16 (AWS ap-southeast-1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Network className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Carrier: 13.56 MHz (SPI Verified via Saleae Logic 8)</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
