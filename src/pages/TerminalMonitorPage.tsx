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

  // Virtual Keypad State Machine
  const [isOtpMode, setIsOtpMode] = useState<boolean>(false);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [isSubmittingKeypad, setIsSubmittingKeypad] = useState<boolean>(false);

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

      if (!isOtpMode) {
        if (json.isLocked) {
          setOledMessage('TERMINAL LOCKED\nSCAN MASTER BADGE');
          setOledSubtext(`${terminalId} | STANDBY`);
        } else {
          setOledMessage(`ACTIVE SESSION\n${json.session?.sectionCode || 'OPEN'}`);
          setOledSubtext('READY FOR CARD SCAN');
        }
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

  const handleKeypadPress = async (key: string) => {
    if (cooldownRemaining > 0) {
      addSimLog(`[PACING INTERLOCK] Keypad locked: ${cooldownRemaining.toFixed(1)}s remaining.`);
      return;
    }

    // Key # triggers / toggles OTP mode or submits
    if (key === '#') {
      if (!isOtpMode) {
        setIsOtpMode(true);
        setKeypadBuffer('');
        setOledMessage('[ ENTER OTP ]\n_ _ _ _ _ _');
        setOledSubtext('ENTER 6 DIGITS, PRESS #');
        addSimLog('>> [KEYPAD] Mode set to OTP entry: [ ENTER OTP ]');
      } else {
        if (keypadBuffer.length === 6) {
          await submitKeypadOtp(keypadBuffer);
        } else {
          addSimLog(`>> [KEYPAD] Incomplete PIN: requires 6 digits (currently ${keypadBuffer.length}).`);
          setOledSubtext(`NEED 6 DIGITS (${keypadBuffer.length}/6)`);
        }
      }
      return;
    }

    // Key * cancels or backspaces
    if (key === '*') {
      if (isOtpMode) {
        if (keypadBuffer.length > 0) {
          const updated = keypadBuffer.slice(0, -1);
          setKeypadBuffer(updated);
          const mask = updated.split('').map(() => '*').join('').padEnd(6, '_');
          setOledMessage(`[ ENTER OTP ]\n${mask.split('').join(' ')}`);
          setOledSubtext(`DIGITS: ${updated.length}/6`);
          addSimLog(`>> [KEYPAD] Backspace -> buffer length: ${updated.length}`);
        } else {
          setIsOtpMode(false);
          setKeypadBuffer('');
          setOledMessage(`ACTIVE SESSION\n${terminalStatus?.session?.sectionCode || 'STANDBY'}`);
          setOledSubtext('READY FOR CARD SCAN');
          addSimLog('>> [KEYPAD] OTP mode aborted.');
        }
      } else {
        addSimLog(">> [KEYPAD] Key '*' pressed (Standby).");
      }
      return;
    }

    // Digits 0-9
    if (/^[0-9]$/.test(key)) {
      if (isOtpMode) {
        if (keypadBuffer.length < 6) {
          const updated = keypadBuffer + key;
          setKeypadBuffer(updated);
          const mask = updated.split('').map(() => '*').join('').padEnd(6, '_');
          setOledMessage(`[ ENTER OTP ]\n${mask.split('').join(' ')}`);
          setOledSubtext(updated.length === 6 ? 'PRESS # TO SUBMIT' : `DIGITS: ${updated.length}/6`);
          addSimLog(`>> [KEYPAD] Key '${key}' pressed -> buffer: ${updated.length}/6`);
        }
      } else {
        addSimLog(`>> [KEYPAD] Key '${key}' ignored. Press '#' first to enter OTP mode.`);
      }
      return;
    }

    // Special Keys A, B, C, D
    if (key === 'A') {
      addSimLog('>> [KEYPAD] Function A: Node ping OK (WiFi RSSI: -42dBm, 13.56 MHz HF).');
    } else if (key === 'B') {
      addSimLog('>> [KEYPAD] Function B: Voltage rail 3.32V stable, Flash: 4MB.');
    } else if (key === 'C') {
      if (isOtpMode) {
        setKeypadBuffer('');
        setOledMessage('[ ENTER OTP ]\n_ _ _ _ _ _');
        setOledSubtext('BUFFER CLEARED');
        addSimLog('>> [KEYPAD] Function C: Buffer reset.');
      }
    } else if (key === 'D') {
      addSimLog('>> [KEYPAD] Function D: Diagnostic buzzer chirp dispatched.');
    }
  };

  const submitKeypadOtp = async (otp: string) => {
    try {
      setIsSubmittingKeypad(true);
      addSimLog(`>> [KEYPAD_TX] Dispatching 6-digit OTP nonce '${otp}' to terminal endpoint...`);

      const res = await fetch(`${API_V1_URL}/hardware/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
        },
        body: JSON.stringify({ terminalId, otp }),
      });

      const json = await res.json();
      addSimLog(`<< [HTTP ${res.status}] ${json.code}: ${json.message}`);

      if (json.code === 'ACCESS_GRANTED') {
        setOledMessage(`ACCESS GRANTED\n${(json.data.studentName || 'STUDENT').toUpperCase()}`);
        setOledSubtext(`KEYPAD OTP | STATUS: ${json.data.status}`);
        setIsOtpMode(false);
        setKeypadBuffer('');
        triggerCooldown();
      } else if (json.code === 'LOCKED_OUT') {
        setOledMessage('TERMINAL LOCKED\n180S LOCKOUT ACTIVE');
        setOledSubtext('3 CONSECUTIVE STRIKES');
        setIsOtpMode(false);
        setKeypadBuffer('');
      } else {
        setOledMessage(`OTP REJECTED\n${json.code}`);
        setOledSubtext(json.message?.slice(0, 24) || 'INVALID CREDENTIAL');
        setIsOtpMode(false);
        setKeypadBuffer('');
      }

      fetchTerminalStatus();
    } catch (err: any) {
      addSimLog(`!! [KEYPAD DISPATCH FAULT] ${err.message}`);
      setOledMessage('COMMUNICATION\nERROR');
      setIsOtpMode(false);
    } finally {
      setIsSubmittingKeypad(false);
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

  const KEYPAD_ROWS = [
    ['1', '2', '3', 'A'],
    ['4', '5', '6', 'B'],
    ['7', '8', '9', 'C'],
    ['*', '0', '#', 'D'],
  ];

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
        {/* Left 60%: Graphic SSD1306 (128x64) Hardware OLED Mirror & 4x4 Keypad */}
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
                    className={`w-3 h-3 rounded-full transition-all ${
                      !terminalStatus?.isLocked && cooldownRemaining === 0
                        ? 'bg-emerald-400 shadow-[0_0_14px_rgba(52,211,153,0.9)]'
                        : 'bg-hud-elevated border border-hud-border'
                    }`}
                  />
                  <span>GPIO 2 [GREEN]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full transition-all ${
                      terminalStatus?.isLocked
                        ? 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)]'
                        : 'bg-hud-elevated border border-hud-border'
                    }`}
                  />
                  <span>GPIO 4 [RED]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full transition-all ${
                      cooldownRemaining > 0
                        ? 'bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]'
                        : 'bg-hud-elevated border border-hud-border'
                    }`}
                  />
                  <span>GPIO 15 [BUZZER]</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Interactive Virtual 4x4 Matrix Keypad Card */}
          <Card
            title="Classroom 4x4 Matrix Keypad"
            subtitle="Interactive hardware keypad simulator (# to enter OTP mode, digits to type, # to submit)"
            action={
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                    isOtpMode
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-hud-elevated text-hud-muted border border-hud-border'
                  }`}
                >
                  {isOtpMode ? `OTP MODE (${keypadBuffer.length}/6)` : 'STANDBY'}
                </span>
              </div>
            }
          >
            <div className="flex flex-col sm:flex-row items-center gap-6 p-2 font-mono">
              {/* 4x4 Tactile Key Grid */}
              <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-hud-elevated/70 border border-hud-border/80 rounded-2xl shadow-tactile shrink-0">
                {KEYPAD_ROWS.map((row, rIdx) =>
                  row.map((k) => {
                    const isHash = k === '#';
                    const isStar = k === '*';
                    const isLetter = ['A', 'B', 'C', 'D'].includes(k);

                    return (
                      <button
                        key={`${rIdx}-${k}`}
                        type="button"
                        disabled={isSubmittingKeypad || cooldownRemaining > 0}
                        onClick={() => handleKeypadPress(k)}
                        className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-40 ${
                          isHash
                            ? isOtpMode && keypadBuffer.length === 6
                              ? 'bg-emerald-500 text-slate-950 font-black shadow-glow-emerald animate-pulse'
                              : 'bg-sky-500/20 text-sky-400 border border-sky-500/40 hover:bg-sky-500/30'
                            : isStar
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                            : isLetter
                            ? 'bg-hud-surface/90 text-sky-300 border border-hud-border/80 hover:bg-hud-hover'
                            : 'bg-hud-surface text-hud-text border border-hud-border hover:bg-hud-hover hover:border-sky-500/40'
                        }`}
                      >
                        {k}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Instructions & Keypad Buffer Status */}
              <div className="space-y-3 text-xs font-body text-hud-secondary w-full">
                <div className="p-3 bg-hud-elevated/40 border border-hud-border/70 rounded-xl space-y-1.5 font-mono">
                  <div className="flex justify-between text-[11px] text-hud-muted">
                    <span>BUFFER REGISTER:</span>
                    <span className="text-sky-400 font-bold">{keypadBuffer.length}/6 DIGITS</span>
                  </div>
                  <div className="text-lg tracking-widest font-extrabold text-hud-text bg-hud-bg/80 px-3 py-1.5 rounded-lg border border-hud-border/60 text-center select-all">
                    {keypadBuffer ? keypadBuffer.padEnd(6, '·') : '······'}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded text-[11px]">#</span>
                    <span>Toggle OTP mode / Submit 6 digits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded text-[11px]">*</span>
                    <span>Backspace digit / Cancel OTP mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-hud-text bg-hud-elevated px-1.5 py-0.5 rounded text-[11px]">A-D</span>
                    <span>Hardware telemetry &amp; node diagnostics</span>
                  </div>
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
                <span className="text-xs font-body opacity-90">Prof. Macadat</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('10A1B2C3', 'Agbada, Justine Jay')}
              >
                <span>STUDENT [0x10A1B2C3]</span>
                <span className="text-xs text-sky-400 font-body">Agbada, J.</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('20B2C3D4', 'Altichie, Rjhay')}
              >
                <span>STUDENT [0x20B2C3D4]</span>
                <span className="text-xs text-sky-400 font-body">Altichie, R.</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('30C3D4E5', 'Cabunoc, Rey')}
              >
                <span>STUDENT [0x30C3D4E5]</span>
                <span className="text-xs text-sky-400 font-body">Cabunoc, R.</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('40D4E5F6', 'Dalupang, John Mark')}
              >
                <span>STUDENT [0x40D4E5F6]</span>
                <span className="text-xs text-sky-400 font-body">Dalupang, J.</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between bg-hud-elevated/50"
                onClick={() => simulateTap('50E5F6A7', 'Malate, Christian Dave')}
              >
                <span>STUDENT [0x50E5F6A7]</span>
                <span className="text-xs text-sky-400 font-body">Malate, C.</span>
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

              <div className="p-3.5 bg-hud-elevated/70 border border-hud-border/70 text-xs text-hud-secondary space-y-1.5 rounded-xl shadow-tactile font-body mt-2">
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

