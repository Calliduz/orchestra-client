import React, { useState, useEffect } from 'react';
import { Cpu, Radio, Shield, Zap, RefreshCw, Keyboard, Play, CheckCircle2, AlertTriangle, Terminal } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { useSocket } from '../context/SocketContext.js';
import { API_V1_URL } from '../config/api.js';

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
      const res = await fetch(`${API_V1_URL}/hardware/status/${terminalId}`);
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

      const res = await fetch(`${API_V1_URL}/hardware/tap`, {
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
      <div className="border-b border-hud-border/80 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-extrabold text-2xl text-hud-text tracking-tight">
              Edge Terminal Diagnostics &amp; OLED Mirror
            </h1>
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
              ESP32 Node
            </span>
          </div>
          <p className="text-xs text-hud-secondary mt-1 font-body">
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
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
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
            <div className="flex flex-col items-center justify-center p-6 bg-hud-elevated/40 border border-hud-border/70 rounded-2xl shadow-tactile">
              {/* Graphic Screen Enclosure with Tactile Bezel */}
              <div className="w-full max-w-sm aspect-[128/64] bg-slate-950 border-2 border-slate-700/80 p-3.5 flex flex-col justify-between relative overflow-hidden font-mono shadow-[inset_0_0_30px_rgba(0,0,0,0.95)] rounded-xl">
                {/* OLED Header */}
                <div className="flex items-center justify-between text-[10px] text-sky-400 font-bold border-b border-sky-500/25 pb-1">
                  <span>ORCHESTRA IoT</span>
                  <span>{terminalId}</span>
                </div>

                {/* OLED Main Phosphor Graphic Text */}
                <div className="my-auto text-center py-2">
                  <pre className="text-sky-300 font-bold text-xs tracking-wider leading-relaxed whitespace-pre-wrap font-mono select-none drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]">
                    {oledMessage}
                  </pre>
                </div>

                {/* OLED Status Footer */}
                <div className="flex items-center justify-between text-[9px] text-sky-400 border-t border-sky-500/25 pt-1">
                  <span className="truncate max-w-[200px]">{oledSubtext}</span>
                  {cooldownRemaining > 0 ? (
                    <span className="text-amber-400 font-bold num-tabular">
                      COOLDOWN: {cooldownRemaining.toFixed(1)}s
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-bold">READY</span>
                  )}
                </div>
              </div>

              {/* Hardware GPIO Status LED Strip with Luminous Halos */}
              <div className="flex items-center gap-6 mt-5 text-xs font-mono text-hud-secondary">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      !terminalStatus?.isLocked && cooldownRemaining === 0
                        ? 'bg-emerald-400 shadow-glow-emerald'
                        : 'bg-hud-elevated border border-hud-border'
                    }`}
                  />
                  <span>GPIO 2 [GREEN]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      terminalStatus?.isLocked
                        ? 'bg-rose-500 shadow-glow-rose'
                        : 'bg-hud-elevated border border-hud-border'
                    }`}
                  />
                  <span>GPIO 4 [RED]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      cooldownRemaining > 0
                        ? 'bg-amber-400 shadow-glow-amber'
                        : 'bg-hud-elevated border border-hud-border'
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
            <div className="space-y-3 font-mono text-xs">
              <Button
                variant="primary"
                size="sm"
                className="w-full justify-between"
                onClick={() => simulateTap('A1B2C3D4', 'Faculty Master Badge')}
              >
                <span>MASTER BADGE [0xA1B2C3D4]</span>
                <span className="text-xs font-body opacity-90">Prof. Macadat</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('10A1B2C3', 'Student 2023-0001-CCS')}
              >
                <span>STUDENT BADGE [0x10A1B2C3]</span>
                <span className="text-xs text-sky-400 font-body">Agbada</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('20B2C3D4', 'Student 2023-0002-CCS')}
              >
                <span>STUDENT BADGE [0x20B2C3D4]</span>
                <span className="text-xs text-sky-400 font-body">Altichie</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50 hover:border-rose-500/40"
                onClick={() => simulateTap('99999999', 'Foreign UID')}
              >
                <span>FOREIGN TAG [0x99999999]</span>
                <span className="text-xs text-rose-400 font-body">404 Unregistered</span>
              </Button>

              <div className="p-3.5 bg-hud-elevated/70 border border-hud-border/70 text-xs text-hud-secondary space-y-1.5 rounded-xl shadow-tactile font-body">
                <div className="text-sky-400 font-bold uppercase tracking-wider text-[11px] font-sans">
                  HARDWARE PACING INTERLOCK
                </div>
                <p className="leading-relaxed">
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
        <div className="p-4 bg-hud-bg border-t border-hud-border text-hud-secondary font-mono text-xs max-h-56 overflow-y-auto space-y-1">
          {simLog.length === 0 ? (
            <div className="text-hud-muted py-4 text-center">
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
