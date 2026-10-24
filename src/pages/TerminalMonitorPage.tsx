import React, { useState, useEffect } from 'react';
import { Cpu, Radio, Shield, Zap, RefreshCw, Keyboard, Play, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { useSocket } from '../context/SocketContext.js';

export const TerminalMonitorPage: React.FC = () => {
  const { terminalId } = useSocket();
  const [terminalStatus, setTerminalStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [oledMessage, setOledMessage] = useState<string>('LOCKED\nSCAN MASTER BADGE');
  const [oledSubtext, setOledSubtext] = useState<string>('TERM-CL304 [STANDBY]');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [simLog, setSimLog] = useState<string[]>([]);

  useEffect(() => {
    document.title = 'ORCHESTRA | Edge Hardware Diagnostic Matrix';
    fetchTerminalStatus();
  }, [terminalId]);

  const fetchTerminalStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`http://localhost:5000/api/v1/hardware/status/${terminalId}`);
      const json = await res.json();
      setTerminalStatus(json);

      if (json.isLocked) {
        setOledMessage('TERMINAL LOCKED\nSCAN MASTER BADGE');
        setOledSubtext(`${terminalId} | STANDBY`);
      } else {
        setOledMessage(`ACTIVE SESSION\n${json.session?.sectionCode || 'OPEN'}`);
        setOledSubtext('READY FOR CARD SCAN');
      }
    } catch (err) {
      console.error('Error fetching terminal status', err);
    } finally {
      setIsLoading(false);
    }
  };

  const simulateTap = async (rfidUid: string, label: string) => {
    if (cooldownRemaining > 0) {
      addSimLog(`[PACING INTERLOCK] Reader hold active: ${cooldownRemaining.toFixed(1)}s remaining.`);
      return;
    }

    try {
      addSimLog(`>> [SPI_MFRC522] Interrogating ISO14443A tag UID: 0x${rfidUid} (${label})...`);

      const res = await fetch('http://localhost:5000/api/v1/hardware/tap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
        },
        body: JSON.stringify({ terminalId, rfidUid }),
      });

      const json = await res.json();
      addSimLog(`<< [HTTP ${res.status}] ${json.code}: ${json.message}`);

      if (json.code === 'ACCESS_GRANTED') {
        setOledMessage(`ACCESS GRANTED\n${json.data.studentName.toUpperCase()}`);
        setOledSubtext(`STATUS: ${json.data.status} | REVERSE-RCV`);
        triggerCooldown();
      } else if (json.code === 'SESSION_STARTED') {
        setOledMessage(`SESSION OPENED\n${json.data.sectionCode}`);
        setOledSubtext('MANIFEST LOADED');
      } else if (json.code === 'SESSION_CLOSED') {
        setOledMessage('SESSION CLOSED\nROSTER COMPILED');
        setOledSubtext('REPORTS EMAILED');
      } else if (json.code === 'ALREADY_RECORDED') {
        setOledMessage('ANTI-PASSBACK\nALREADY LOGGED');
        setOledSubtext('DOUBLE-TAP REJECTED');
      } else if (json.code === 'SESSION_LOCKED') {
        setOledMessage('TERMINAL LOCKED\nACCESS REJECTED');
        setOledSubtext('SCAN FACULTY BADGE');
      }

      fetchTerminalStatus();
    } catch (err: any) {
      addSimLog(`!! [BUS FAULT] ${err.message}`);
    }
  };

  const triggerCooldown = () => {
    setCooldownRemaining(3.0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, 3.0 - elapsed);
      setCooldownRemaining(left);
      if (left <= 0) {
        clearInterval(interval);
        setOledMessage('ACTIVE SESSION\nREADY FOR CARD SCAN');
        setOledSubtext('ORCHESTRA EDGE TERMINAL');
      }
    }, 100);
  };

  const addSimLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    setSimLog((prev: string[]) => [`[${time}] ${msg}`, ...prev.slice(0, 30)]);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="border-b border-[#1E2632] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-bold text-2xl text-[#F1F5F9] tracking-tight">
              Edge Terminal Diagnostics &amp; OLED Mirror
            </h1>
            <span className="text-[10px] font-mono font-semibold bg-[#112209] text-[#CCFF00] border border-[#29420D] px-2 py-0.5">
              ESP32 Node
            </span>
          </div>
          <p className="text-xs text-[#8C98A8] mt-1 font-mono">
            Physical ESP32 firmware state machine, SPI MFRC522 transponder polling, and non-blocking 3000ms pacing interlock.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Badge
            status={terminalStatus?.isLocked ? 'LOCKED' : 'OPEN'}
            label={terminalStatus?.isLocked ? 'STATE: LOCKED' : 'STATE: OPEN'}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTerminalStatus}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />}
          >
            Poll State
          </Button>
        </div>
      </div>

      {/* Asymmetric 60 / 40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 60%: Graphic SSD1306 (128x64) Hardware OLED Mirror */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="SSD1306 0.96&quot; I2C OLED Screen Mirror (128x64)"
            subtitle="Pixel-mapped hardware rendering matching the physical classroom display"
          >
            <div className="flex flex-col items-center justify-center p-6 bg-[#06080B] border border-[#1E2632]">
              {/* Graphic Screen Enclosure */}
              <div className="w-full max-w-sm aspect-[128/64] bg-black border border-[#222E3D] p-3 flex flex-col justify-between relative overflow-hidden font-mono shadow-[inset_0_0_24px_rgba(0,0,0,0.95)]">
                {/* OLED Header */}
                <div className="flex items-center justify-between text-[10px] text-[#CCFF00] font-bold border-b border-[#CCFF00]/20 pb-0.5">
                  <span>ORCHESTRA IoT</span>
                  <span>{terminalId}</span>
                </div>

                {/* OLED Main Phosphor Graphic Text */}
                <div className="my-auto text-center py-2">
                  <pre className="text-[#CCFF00] font-bold text-xs tracking-wider leading-relaxed whitespace-pre-wrap font-mono select-none">
                    {oledMessage}
                  </pre>
                </div>

                {/* OLED Status Footer */}
                <div className="flex items-center justify-between text-[9px] text-[#CCFF00] border-t border-[#CCFF00]/20 pt-0.5">
                  <span className="truncate max-w-[200px]">{oledSubtext}</span>
                  {cooldownRemaining > 0 ? (
                    <span className="text-[#FB923C] font-bold num-tabular">
                      COOLDOWN: {cooldownRemaining.toFixed(1)}s
                    </span>
                  ) : (
                    <span className="text-[#CCFF00]">READY</span>
                  )}
                </div>
              </div>

              {/* Hardware GPIO Status LED Strip */}
              <div className="flex items-center gap-6 mt-4 text-[11px] font-mono text-[#7E8B9B]">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      !terminalStatus?.isLocked && cooldownRemaining === 0
                        ? 'bg-[#CCFF00] shadow-[0_0_8px_#CCFF00]'
                        : 'bg-[#18202B]'
                    }`}
                  />
                  <span>GPIO 2 [GREEN]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      terminalStatus?.isLocked
                        ? 'bg-[#EF4444] shadow-[0_0_8px_#EF4444]'
                        : 'bg-[#18202B]'
                    }`}
                  />
                  <span>GPIO 4 [RED]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full transition-colors ${
                      cooldownRemaining > 0
                        ? 'bg-[#F59E0B] shadow-[0_0_8px_#F59E0B]'
                        : 'bg-[#18202B]'
                    }`}
                  />
                  <span>GPIO 15 [BUZZER]</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 40%: Hardware Interrogation Simulation Controls */}
        <div className="lg:col-span-5 space-y-6">
          <Card
            title="SPI Transponder Interrogator"
            subtitle="Trigger card scans directly via hardware REST endpoint"
          >
            <div className="space-y-2.5 font-mono text-xs">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-between"
                onClick={() => simulateTap('A1B2C3D4', 'Faculty Master Badge')}
              >
                <span>MASTER BADGE [0xA1B2C3D4]</span>
                <span className="text-[10px] font-sans opacity-85">Prof. Macadat</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => simulateTap('10A1B2C3', 'Student 2023-0001-CCS')}
              >
                <span>STUDENT BADGE [0x10A1B2C3]</span>
                <span className="text-[10px] text-[#8C98A8]">Agbada</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => simulateTap('20B2C3D4', 'Student 2023-0002-CCS')}
              >
                <span>STUDENT BADGE [0x20B2C3D4]</span>
                <span className="text-[10px] text-[#8C98A8]">Altichie</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => simulateTap('99999999', 'Foreign UID')}
              >
                <span>FOREIGN TAG [0x99999999]</span>
                <span className="text-[10px] text-[#F87171]">404 Unregistered</span>
              </Button>

              <div className="p-3 bg-[#0A0D12] border border-[#1E2632] text-[11px] text-[#8C98A8] space-y-1">
                <div className="text-[#CCFF00] font-bold">
                  HARDWARE PACING INTERLOCK
                </div>
                <p>
                  Enforces a deterministic 3000ms non-blocking cooldown via embedded <code>millis()</code> between consecutive student scans to disrupt rapid batch-swiping.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Logic Analyzer & Serial Console Feed */}
      <Card
        title="Edge Serial Console &amp; Protocol Log"
        subtitle="Live UART 115200 baud bus telemetry stream"
        bodyClassName="p-0"
      >
        <div className="p-4 bg-[#06080B] border-t border-[#1E2632] text-[#8C98A8] font-mono text-xs max-h-56 overflow-y-auto space-y-1">
          {simLog.length === 0 ? (
            <div className="text-[#475569] py-4 text-center">
              TERMINAL LISTENER ACTIVE: Awaiting RFID interrogation or keypad packet...
            </div>
          ) : (
            simLog.map((log: string, i: number) => (
              <div key={i} className="leading-relaxed">
                {log}
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};

export default TerminalMonitorPage;
