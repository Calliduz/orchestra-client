import React, { useState, useEffect } from 'react';
import { Cpu, Radio, Shield, Zap, RefreshCw, Keyboard, Play, CheckCircle2, AlertTriangle, Terminal, Volume2, VolumeX, WifiOff, HardDrive, UploadCloud, Wifi, Activity, Clock, Sliders, BellOff, Bell } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { Badge } from '../components/ui/Badge.js';
import { useSocket } from '../context/SocketContext.js';
import { useAuth } from '../context/AuthContext.js';
import { API_V1_URL } from '../config/api.js';
import { sounds } from '../utils/audio.js';

export interface FleetTerminal {
  terminalId: string;
  rssi: number;
  freeHeap: number;
  uptimeSec: number;
  readerStatus: string;
  version: string;
  lastSeen: string | null;
  status: 'ONLINE' | 'WEAK_RSSI' | 'OFFLINE';
  roomNumber?: string;
  isQuietMode?: boolean;
}

export const TerminalMonitorPage: React.FC = () => {
  const { socket, terminalId, setTerminalId } = useSocket();
  const { token } = useAuth();
  const [terminalStatus, setTerminalStatus] = useState<any>(null);
  const [fleetTerminals, setFleetTerminals] = useState<FleetTerminal[]>([]);
  const [isFleetLoading, setIsFleetLoading] = useState(false);
  const [isQuietModeToggling, setIsQuietModeToggling] = useState(false);
  const [authorizedFaculty, setAuthorizedFaculty] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [oledMessage, setOledMessage] = useState<string>('LOCKED\nSCAN MASTER BADGE');
  const [oledSubtext, setOledSubtext] = useState<string>('TERM-CL304 [STANDBY]');
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [simLog, setSimLog] = useState<string[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => !sounds.enabled);
  const cooldownIntervalRef = React.useRef<number | null>(null);

  // Offline Simulation State & Local Queue
  const [isOfflineSimMode, setIsOfflineSimMode] = useState<boolean>(false);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [isSyncingOffline, setIsSyncingOffline] = useState<boolean>(false);

  // Virtual Keypad State Machine
  const [isOtpMode, setIsOtpMode] = useState<boolean>(false);
  const [keypadBuffer, setKeypadBuffer] = useState<string>('');
  const [isSubmittingKeypad, setIsSubmittingKeypad] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'ORCHESTRA | Edge Hardware Diagnostic Matrix';
    fetchTerminalStatus();
    fetchFleetTerminals();

    // Check if user navigated here with a minted PIN from StudentOtpPage
    const autoOtp = localStorage.getItem('orchestra_ingress_otp');
    if (autoOtp && autoOtp.length === 6) {
      loadKeypadOtp(autoOtp);
      localStorage.removeItem('orchestra_ingress_otp');
    }

    const handleKeypadBridge = (e: any) => {
      const pin = e.detail?.otp;
      if (pin) {
        loadKeypadOtp(pin);
      }
    };

    const handleSoundToggle = (e: any) => {
      if (typeof e.detail?.enabled === 'boolean') {
        setIsAudioMuted(!e.detail.enabled);
      }
    };

    window.addEventListener('orchestra:test_keypad', handleKeypadBridge);
    window.addEventListener('orchestra:sound_toggled', handleSoundToggle);

    // Socket.io telemetry listeners for live fleet updates
    if (socket) {
      socket.on('terminal:heartbeat', (telemetry: FleetTerminal) => {
        setFleetTerminals((prev) => {
          const idx = prev.findIndex((t) => t.terminalId === telemetry.terminalId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = telemetry;
            return updated;
          }
          return [...prev, telemetry];
        });
        if (telemetry.terminalId === terminalId) {
          addSimLog(`[HEARTBEAT] ${telemetry.terminalId} -> RSSI: ${telemetry.rssi}dBm | Heap: ${(telemetry.freeHeap / 1024).toFixed(0)}KB | Uptime: ${telemetry.uptimeSec}s`);
        }
      });

      socket.on('terminal:quiet-mode', ({ terminalId: tid, isQuietMode: qm }: { terminalId: string; isQuietMode: boolean }) => {
        setFleetTerminals((prev) =>
          prev.map((t) => (t.terminalId === tid ? { ...t, isQuietMode: qm } : t))
        );
        if (tid === terminalId) {
          setTerminalStatus((prev: any) => ({ ...prev, isQuietMode: qm }));
          addSimLog(`[QUIET_MODE] Terminal ${tid} quiet mode set to ${qm ? 'DAMPENED' : 'NORMAL'}`);
        }
      });
    }

    // Live relative time tick for last-seen timer
    const fleetTicker = window.setInterval(() => {
      setFleetTerminals((prev) => [...prev]);
    }, 5000);

    return () => {
      window.removeEventListener('orchestra:test_keypad', handleKeypadBridge);
      window.removeEventListener('orchestra:sound_toggled', handleSoundToggle);
      if (cooldownIntervalRef.current) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
      }
      clearInterval(fleetTicker);
      if (socket) {
        socket.off('terminal:heartbeat');
        socket.off('terminal:quiet-mode');
      }
    };
  }, [terminalId, socket]);

  const fetchFleetTerminals = async () => {
    try {
      setIsFleetLoading(true);
      const res = await fetch(`${API_V1_URL}/hardware/terminals`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
        },
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFleetTerminals(json.data);
      }
    } catch (err) {
      console.error('Error fetching fleet terminals:', err);
    } finally {
      setIsFleetLoading(false);
    }
  };

  const toggleQuietMode = async (targetId?: string) => {
    const tid = targetId || terminalId;
    try {
      setIsQuietModeToggling(true);
      const currentTerminal = fleetTerminals.find((t) => t.terminalId === tid);
      const currentQuiet = currentTerminal ? currentTerminal.isQuietMode : terminalStatus?.isQuietMode || false;
      const res = await fetch(`${API_V1_URL}/hardware/quiet-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
        },
        body: JSON.stringify({
          terminalId: tid,
          enabled: !currentQuiet,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setTerminalStatus((prev: any) => ({ ...prev, isQuietMode: json.data?.isQuietMode }));
        addSimLog(`>> [QUIET_MODE] Toggled quiet mode on ${tid} to ${json.data?.isQuietMode ? 'DAMPENED' : 'NORMAL'}`);
        fetchFleetTerminals();
      }
    } catch (err: any) {
      addSimLog(`!! [QUIET_MODE_ERR] ${err.message}`);
    } finally {
      setIsQuietModeToggling(false);
    }
  };

  const formatLastSeen = (isoStr: string | null): string => {
    if (!isoStr) return 'Never seen';
    const diffSec = Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000);
    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return `${Math.floor(diffSec / 3600)}h ago`;
  };

  const formatUptime = (seconds: number): string => {
    if (!seconds || seconds <= 0) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${secs}s`;
  };

  const loadKeypadOtp = (pin: string) => {
    setIsOtpMode(true);
    setKeypadBuffer(pin);
    const mask = pin.split('').map(() => '*').join(' ');
    setOledMessage(`[ ENTER OTP ]\n${mask}`);
    setOledSubtext('READY: PRESS # TO VERIFY');
    addSimLog(`>> [KEYPAD_BRIDGE] Loaded ephemeral OTP '${pin}'. Ready for verification.`);
    sounds.playKeyChirp();
  };

  const toggleAudio = () => {
    const nextMuted = isAudioMuted;
    sounds.setEnabled(nextMuted);
    setIsAudioMuted(!nextMuted);
  };

  const fetchTerminalStatus = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_V1_URL}/hardware/status/${terminalId}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
        },
      });
      const json = await res.json();
      setTerminalStatus(json);
      if (json.authorizedFaculty) {
        setAuthorizedFaculty(json.authorizedFaculty);
      }

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

  const flushOfflineQueue = async () => {
    if (offlineQueue.length === 0) return;
    try {
      setIsSyncingOffline(true);
      addSimLog(`>> [OFFLINE_SYNC_TX] Uploading ${offlineQueue.length} buffered taps to /hardware/offline-sync...`);
      setOledMessage('UPLOADING LOGS\nPLEASE WAIT...');
      setOledSubtext('BATCH SYNC IN PROGRESS');

      const res = await fetch(`${API_V1_URL}/hardware/offline-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'ORCHESTRA_ESP32_SECURE_TOKEN_2026',
        },
        body: JSON.stringify({
          terminalId,
          sessionAction: 'CONTINUE',
          records: offlineQueue,
        }),
      });
      const json = await res.json();
      addSimLog(`<< [HTTP ${res.status}] OFFLINE_SYNC_OK: ${json.message}`);
      sounds.playSuccessChime();
      setOledMessage(`[ SYNC COMPLETE ]\nUPLOADED: ${json.syncedCount || offlineQueue.length} TAPS`);
      setOledSubtext('CLOUD SYNCED OK');
      setOfflineQueue([]);
      fetchTerminalStatus();
    } catch (err: any) {
      sounds.playErrorBuzz();
      addSimLog(`!! [SYNC FAILED] ${err.message}`);
    } finally {
      setIsSyncingOffline(false);
    }
  };

  const simulateTap = async (rfidUid: string, label: string) => {
    if (cooldownRemaining > 0) {
      addSimLog(`[PACING INTERLOCK] Reader hold active: ${cooldownRemaining.toFixed(1)}s remaining.`);
      sounds.playErrorBuzz();
      return;
    }

    // -------------------------------------------------------------
    // OFFLINE RESILIENCY SIMULATION MODE
    // -------------------------------------------------------------
    if (isOfflineSimMode) {
      const isProf =
        authorizedFaculty.some((f) => f.rfidUid?.toUpperCase() === rfidUid.toUpperCase()) ||
        rfidUid.toUpperCase() === '892B2E8E' ||
        rfidUid.toUpperCase() === '71394417' ||
        rfidUid.toUpperCase() === '99AA88BB';

      if (isProf) {
        const nextLocked = !terminalStatus?.isLocked;
        setTerminalStatus((prev: any) => ({ ...prev, isLocked: nextLocked }));
        sounds.playSuccessChime();
        setOledMessage(
          nextLocked
            ? '[ OFFLINE SESSION ]\nSESSION LOCKED'
            : '[ OFFLINE SESSION ]\nSESSION UNLOCKED'
        );
        setOledSubtext(nextLocked ? 'QUEUED FOR SYNC' : 'READY FOR INGRESS');
        addSimLog(
          `>> [OFFLINE_TRUST] Authorized Professor 0x${rfidUid} (${label}) tapped. Toggled offline session: ${
            nextLocked ? 'LOCKED' : 'OPEN'
          }.`
        );
        return;
      }

      if (terminalStatus?.isLocked) {
        sounds.playErrorBuzz();
        setOledMessage('TERMINAL LOCKED\nACCESS REJECTED');
        setOledSubtext('SCAN PROF BADGE');
        addSimLog(`>> [OFFLINE_REJECT] Card 0x${rfidUid} tapped while terminal is locked offline.`);
        return;
      }

      // Check anti-passback in offline queue
      if (offlineQueue.some((q) => q.rfidUid.toUpperCase() === rfidUid.toUpperCase())) {
        sounds.playErrorBuzz();
        setOledMessage('ANTI-PASSBACK\nALREADY LOGGED');
        setOledSubtext('IN OFFLINE CACHE');
        addSimLog(`>> [OFFLINE_ANTI_PASSBACK] Card 0x${rfidUid} already buffered in local queue!`);
        return;
      }

      // Buffer tap in offline queue
      const tapRecord = {
        rfidUid,
        label,
        timestamp: new Date().toISOString(),
        authMethod: 'RFID_TAP',
      };
      const updatedQueue = [...offlineQueue, tapRecord];
      setOfflineQueue(updatedQueue);
      sounds.playSuccessChime();
      setOledMessage(`[ OFFLINE SAVED ]\n0x${rfidUid}`);
      setOledSubtext(`QUEUE #${updatedQueue.length} PENDING`);
      addSimLog(
        `>> [OFFLINE_BUFFER] Tap for 0x${rfidUid} (${label}) saved to local NVS queue (#${updatedQueue.length}).`
      );
      triggerCooldown();
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
        sounds.playSuccessChime();
        setOledMessage(`ACCESS GRANTED\n${json.data.studentName.toUpperCase()}`);
        setOledSubtext(`STATUS: ${json.data.status} | REVERSE-RCV`);
        triggerCooldown();
      } else if (json.code === 'SESSION_STARTED') {
        sounds.playSuccessChime();
        setOledMessage(`SESSION OPENED\n${json.data.sectionCode}`);
        setOledSubtext('MANIFEST LOADED');
      } else if (json.code === 'SESSION_CLOSED') {
        sounds.playSuccessChime();
        setOledMessage('SESSION CLOSED\nROSTER COMPILED');
        setOledSubtext('REPORTS EMAILED');
      } else if (json.code === 'ALREADY_RECORDED') {
        sounds.playErrorBuzz();
        setOledMessage('ANTI-PASSBACK\nALREADY LOGGED');
        setOledSubtext('DOUBLE-TAP REJECTED');
      } else if (json.code === 'SESSION_LOCKED') {
        sounds.playErrorBuzz();
        setOledMessage('TERMINAL LOCKED\nACCESS REJECTED');
        setOledSubtext('SCAN FACULTY BADGE');
      } else {
        sounds.playErrorBuzz();
      }

      fetchTerminalStatus();
    } catch (err: any) {
      sounds.playErrorBuzz();
      addSimLog(`!! [BUS FAULT] ${err.message}`);
    }
  };

  const handleKeypadPress = async (key: string) => {
    if (cooldownRemaining > 0) {
      addSimLog(`[PACING INTERLOCK] Keypad locked: ${cooldownRemaining.toFixed(1)}s remaining.`);
      sounds.playErrorBuzz();
      return;
    }

    sounds.playKeyChirp();

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
          sounds.playErrorBuzz();
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
        sounds.playSuccessChime();
        setOledMessage(`ACCESS GRANTED\n${(json.data.studentName || 'STUDENT').toUpperCase()}`);
        setOledSubtext(`KEYPAD OTP | STATUS: ${json.data.status}`);
        setIsOtpMode(false);
        setKeypadBuffer('');
        triggerCooldown();
      } else if (json.code === 'LOCKED_OUT') {
        sounds.playErrorBuzz();
        setOledMessage('TERMINAL LOCKED\n180S LOCKOUT ACTIVE');
        setOledSubtext('3 CONSECUTIVE STRIKES');
        setIsOtpMode(false);
        setKeypadBuffer('');
      } else {
        sounds.playErrorBuzz();
        setOledMessage(`OTP REJECTED\n${json.code}`);
        setOledSubtext(json.message?.slice(0, 24) || 'INVALID CREDENTIAL');
        setIsOtpMode(false);
        setKeypadBuffer('');
      }

      fetchTerminalStatus();
    } catch (err: any) {
      sounds.playErrorBuzz();
      addSimLog(`!! [KEYPAD DISPATCH FAULT] ${err.message}`);
      setOledMessage('COMMUNICATION\nERROR');
      setIsOtpMode(false);
    } finally {
      setIsSubmittingKeypad(false);
    }
  };

  const triggerCooldown = () => {
    if (cooldownIntervalRef.current) {
      clearInterval(cooldownIntervalRef.current);
      cooldownIntervalRef.current = null;
    }
    setCooldownRemaining(3.0);
    const start = Date.now();
    cooldownIntervalRef.current = window.setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, 3.0 - elapsed);
      setCooldownRemaining(left);
      if (left <= 0) {
        if (cooldownIntervalRef.current) {
          clearInterval(cooldownIntervalRef.current);
          cooldownIntervalRef.current = null;
        }
        setOledMessage('ACTIVE SESSION\nREADY FOR CARD SCAN');
        setOledSubtext('ORCHESTRA EDGE TERMINAL');
      }
    }, 100);
  };

  const addSimLog = (msg: string) => {
    const time = new Date().toLocaleTimeString('en-US', { hour12: true });
    setSimLog((prev: string[]) => [`[${time}] ${msg}`, ...prev.slice(0, 30)]);
  };

  const KEYPAD_ROWS = [
    ['1', '2', '3', 'A'],
    ['4', '5', '6', 'B'],
    ['7', '8', '9', 'C'],
    ['*', '0', '#', 'D'],
  ];

  const TRANSPONDER_BADGES = [
    {
      uid: '892B2E8E',
      name: 'Prof. Karlito Macadat',
      role: 'FACULTY MASTER KEYCARD (AR101)',
      type: 'master',
    },
    {
      uid: '71394417',
      name: 'Prof. Justine Jay Agbada',
      role: 'FACULTY MASTER KEYCARD (IT302)',
      type: 'master',
    },
    {
      uid: '418606B1',
      name: 'Dalupang, Juztyne Clever',
      role: 'STUDENT 2023-0004-CCS',
      type: 'student',
    },
    {
      uid: '91C6F3B0',
      name: 'Agbada, Justine Jay',
      role: 'STUDENT 2023-0001-CCS',
      type: 'student',
    },
    {
      uid: 'B173F9B0',
      name: 'Altichie, Rjhay',
      role: 'STUDENT 2023-0002-CCS',
      type: 'student',
    },
    {
      uid: '119255B1',
      name: 'Cabunoc, Josh Lister',
      role: 'STUDENT 2023-0003-CCS',
      type: 'student',
    },
    {
      uid: 'DEADBEEF',
      name: '404 Rogue Unregistered Tag',
      role: 'UNREGISTERED CARD TEST',
      type: 'foreign',
    },
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
          {/* Lecture Quiet Mode Quick Toggle */}
          <button
            type="button"
            disabled={isQuietModeToggling}
            onClick={() => toggleQuietMode(terminalId)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 transition-all active:scale-95 ${
              terminalStatus?.isQuietMode
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm'
                : 'bg-hud-surface text-hud-secondary border-hud-border/70 hover:bg-hud-hover'
            }`}
            title="Toggle Lecture Quiet Mode (Dampen buzzer clicks & chimes)"
          >
            {terminalStatus?.isQuietMode ? <BellOff className="w-3.5 h-3.5 text-purple-400" /> : <Bell className="w-3.5 h-3.5 text-slate-400" />}
            <span>{terminalStatus?.isQuietMode ? 'Quiet Mode: ON' : 'Quiet Mode: OFF'}</span>
          </button>
          <button
            type="button"
            onClick={toggleAudio}
            className={`p-2 rounded-xl border transition-all ${
              isAudioMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                : 'bg-hud-surface border-hud-border/70 text-emerald-500 dark:text-emerald-400 hover:bg-hud-hover'
            }`}
            title={isAudioMuted ? 'Unmute Terminal Audio' : 'Mute Terminal Audio'}
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              fetchTerminalStatus();
              fetchFleetTerminals();
            }}
            isLoading={isLoading || isFleetLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading || isFleetLoading ? 'animate-spin' : ''}`} />}
          >
            Poll State
          </Button>
        </div>
      </div>

      {/* P5: Terminal Fleet Health Monitoring & Telemetry Watchdog */}
      <Card
        title="Terminal Fleet Health Monitoring & Telemetry Watchdog"
        subtitle="Real-time multi-terminal edge watchdog, Wi-Fi RSSI watchdog, and memory telemetry stream"
        action={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
              Fleet Nodes: {fleetTerminals.length}
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fleetTerminals.length === 0 ? (
            <div className="col-span-full py-8 text-center text-xs font-mono text-slate-500">
              No terminals registered in fleet watchdog. Polling background edge heartbeats...
            </div>
          ) : (
            fleetTerminals.map((node) => {
              const isSelected = node.terminalId === terminalId;
              const isOnline = node.status === 'ONLINE';
              const isWeak = node.status === 'WEAK_RSSI';
              const isOffline = node.status === 'OFFLINE';

              // Heap percentage calculation (typical 300KB usable dynamic heap on ESP32)
              const heapKb = Math.round(node.freeHeap / 1024);
              const heapPercent = Math.min(100, Math.max(5, Math.round((node.freeHeap / 300000) * 100)));

              return (
                <div
                  key={node.terminalId}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                    isSelected
                      ? 'bg-slate-900/90 border-sky-500/60 shadow-lg ring-1 ring-sky-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-extrabold text-sm text-white">{node.terminalId}</span>
                        {isSelected && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold uppercase">
                            Mirror Active
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-body mt-0.5">
                        {node.roomNumber || 'Classroom Ingress'} • {node.version}
                      </div>
                    </div>

                    {/* Status Alert Badge */}
                    {isOnline && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        ONLINE
                      </span>
                    )}
                    {isWeak && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        WEAK RSSI
                      </span>
                    )}
                    {isOffline && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                        <WifiOff className="w-3 h-3 text-rose-400" />
                        OFFLINE ALERT
                      </span>
                    )}
                  </div>

                  {/* Free Heap Memory Gauge */}
                  <div className="space-y-1.5 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-sky-400" />
                        <span>FREE HEAP MEMORY</span>
                      </span>
                      <span className="text-white font-bold">{heapKb} KB ({heapPercent}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          heapKb > 150 ? 'bg-emerald-500' : heapKb > 70 ? 'bg-amber-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${heapPercent}%` }}
                      />
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Wifi className="w-2.5 h-2.5 text-sky-400" />
                        <span>WI-FI RSSI</span>
                      </div>
                      <div className={`font-bold mt-0.5 ${node.rssi < -80 ? 'text-amber-400' : 'text-slate-200'}`}>
                        {node.rssi} dBm
                      </div>
                    </div>

                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-emerald-400" />
                        <span>UPTIME</span>
                      </div>
                      <div className="font-bold text-slate-200 mt-0.5">
                        {formatUptime(node.uptimeSec)}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Radio className="w-2.5 h-2.5 text-purple-400" />
                        <span>RFID READER</span>
                      </div>
                      <div className="font-bold text-slate-200 mt-0.5 truncate">
                        {node.readerStatus}
                      </div>
                    </div>

                    <div className="p-2 rounded bg-slate-950/40 border border-slate-800/60">
                      <div className="text-[9px] text-slate-500 flex items-center gap-1">
                        <Activity className="w-2.5 h-2.5 text-amber-400" />
                        <span>LAST HEARTBEAT</span>
                      </div>
                      <div className="font-bold text-slate-200 mt-0.5">
                        {formatLastSeen(node.lastSeen)}
                      </div>
                    </div>
                  </div>

                  {/* Quick Card Controls */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/70">
                    <button
                      type="button"
                      onClick={() => toggleQuietMode(node.terminalId)}
                      className={`text-[10px] font-mono px-2 py-1 rounded-lg border flex items-center gap-1 transition ${
                        node.isQuietMode
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                      title="Lecture Quiet Mode: Auto-dampens terminal buzzer after late threshold"
                    >
                      {node.isQuietMode ? <BellOff className="w-3 h-3 text-purple-400" /> : <Bell className="w-3 h-3 text-slate-400" />}
                      <span>{node.isQuietMode ? 'Quiet: ON' : 'Quiet: OFF'}</span>
                    </button>

                    {!isSelected && (
                      <button
                        type="button"
                        onClick={() => {
                          setTerminalId(node.terminalId);
                          fetchTerminalStatus();
                        }}
                        className="text-[10px] font-mono font-bold text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1"
                      >
                        <span>Select Mirror</span>
                        <span>&rarr;</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Asymmetric 60 / 40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 60%: Graphic SSD1306 (128x64) Hardware OLED Mirror & 4x4 Keypad */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="SSD1306 0.96&quot; I2C OLED Screen Mirror (128x64)"
            subtitle="Pixel-mapped hardware rendering matching the physical classroom display"
          >
            <div className="flex flex-col items-center justify-center p-6 bg-slate-900/80 border border-slate-700/80 rounded-2xl shadow-tactile">
              {/* Graphic Screen Enclosure with Tactile Bezel */}
              <div className="w-full max-w-sm aspect-[128/64] bg-slate-950 border-2 border-slate-700/80 p-3.5 flex flex-col justify-between relative overflow-hidden font-mono shadow-[inset_0_0_30px_rgba(0,0,0,0.95)] rounded-xl">
                {/* OLED Header */}
                <div className="flex items-center justify-between text-[10px] text-sky-400 font-bold border-b border-sky-500/25 pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" />
                    <span>ORCHESTRA IoT</span>
                  </div>
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
                        : 'bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600'
                    }`}
                  />
                  <span>GPIO 2 [GREEN]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full transition-all ${
                      terminalStatus?.isLocked
                        ? 'bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.9)]'
                        : 'bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600'
                    }`}
                  />
                  <span>GPIO 4 [RED]</span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full transition-all ${
                      cooldownRemaining > 0
                        ? 'bg-amber-400 shadow-[0_0_14px_rgba(251,191,36,0.9)]'
                        : 'bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600'
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
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}
                >
                  {isOtpMode ? `OTP MODE (${keypadBuffer.length}/6)` : 'STANDBY'}
                </span>
              </div>
            }
          >
            <div className="flex flex-col sm:flex-row items-center gap-6 p-2 font-mono">
              {/* 4x4 Tactile Key Grid */}
              <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-slate-900 border border-slate-800 rounded-2xl shadow-tactile shrink-0">
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
                            ? 'bg-sky-950/40 text-sky-300 border border-sky-800 hover:bg-sky-900/50'
                            : 'bg-slate-800 text-slate-100 border border-slate-700 hover:bg-slate-700 hover:border-sky-400'
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
                <div className="p-3 bg-slate-900/80 border border-slate-700/80 rounded-xl space-y-1.5 font-mono">
                  <div className="flex justify-between text-[11px] text-hud-muted">
                    <span>BUFFER REGISTER:</span>
                    <span className="text-sky-400 font-bold">{keypadBuffer.length}/6 DIGITS</span>
                  </div>
                  <div className="text-lg tracking-widest font-extrabold text-white bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700/60 text-center select-all">
                    {keypadBuffer ? keypadBuffer.padEnd(6, '·') : '······'}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-500/15 px-1.5 py-0.5 rounded text-[11px]">#</span>
                    <span>Toggle OTP mode / Submit 6 digits</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded text-[11px]">*</span>
                    <span>Backspace digit / Cancel OTP mode</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-[11px]">A-D</span>
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
            <div className="space-y-2.5 font-body text-xs">
              {TRANSPONDER_BADGES.map((b) => {
                const isMaster = b.type === 'master';
                const isForeign = b.type === 'foreign';

                return (
                  <div
                    key={b.uid}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isMaster
                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 shadow-sm'
                        : isForeign
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                        : 'bg-slate-900/60 border border-slate-700/80 hover:border-sky-400 text-hud-text'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                          isMaster
                            ? 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                            : isForeign
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        <Radio className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <div className="font-bold text-xs truncate leading-tight text-white">
                          {b.name}
                        </div>
                        <div className="font-mono text-[10px] text-hud-muted mt-0.5 flex items-center gap-1.5">
                          <span
                            className={
                              isMaster
                                ? 'text-sky-400 font-bold'
                                : isForeign
                                ? 'text-rose-400 font-bold'
                                : 'text-slate-400 font-semibold'
                            }
                          >
                            0x{b.uid}
                          </span>
                          <span>•</span>
                          <span className="truncate">{b.role}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={cooldownRemaining > 0}
                      onClick={() => simulateTap(b.uid, b.name)}
                      className={`ml-2 px-3 py-1.5 rounded-lg font-mono text-[11px] font-bold tracking-wider shrink-0 transition-all active:scale-95 disabled:opacity-40 shadow-xs ${
                        isMaster
                          ? 'bg-sky-600 hover:bg-sky-500 text-white'
                          : isForeign
                          ? 'bg-rose-600 hover:bg-rose-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sky-400'
                      }`}
                    >
                      TAP
                    </button>
                  </div>
                );
              })}

              <div className="p-3.5 bg-slate-900/80 border border-slate-700/80 text-xs text-hud-secondary space-y-1.5 rounded-xl shadow-tactile font-body mt-3">
                <div className="text-sky-400 font-bold uppercase tracking-wider text-[11px] font-sans">
                  HARDWARE PACING INTERLOCK
                </div>
                <p className="leading-relaxed">
                  Enforces a deterministic 3000ms non-blocking cooldown via embedded <code>millis()</code> between consecutive student scans to disrupt rapid batch-swiping.
                </p>
              </div>
            </div>
          </Card>

          {/* Offline Resiliency & Local Professor Cache Card */}
          <Card
            title="Offline Resiliency & Professor UID Cache"
            subtitle="Embedded NVS persistence during network outage (Paper Architecture)"
          >
            <div className="space-y-3 font-body text-xs">
              {/* Mode Toggle & Queue Status */}
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/[0.08] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${isOfflineSimMode ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                  <span className="font-mono text-xs font-semibold text-white">
                    {isOfflineSimMode ? 'SIMULATING NETWORK OUTAGE' : 'ONLINE LINK ACTIVE'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isOfflineSimMode;
                    setIsOfflineSimMode(next);
                    addSimLog(
                      next
                        ? '>> [NETWORK_SIM] Wi-Fi Link severed. Operating in OFFLINE RESILIENCY mode.'
                        : '>> [NETWORK_SIM] Wi-Fi Link restored. Operating in ONLINE mode.'
                    );
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold transition flex items-center gap-1.5 border ${
                    isOfflineSimMode
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 border-white/[0.1]'
                  }`}
                >
                  <WifiOff className="w-3 h-3" />
                  <span>{isOfflineSimMode ? 'Restore Wi-Fi' : 'Simulate Wi-Fi Drop'}</span>
                </button>
              </div>

              {/* Local Professor UIDs Cache */}
              <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] text-purple-300 font-bold uppercase flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-purple-400" />
                    <span>Local Professor UIDs (NVS Mirrored)</span>
                  </span>
                  <span className="text-[10px] font-mono text-purple-400">
                    {authorizedFaculty.length || 3} Cached
                  </span>
                </div>
                <div className="space-y-1">
                  {(authorizedFaculty.length > 0
                    ? authorizedFaculty
                    : [
                        { rfidUid: '892B2E8E', name: 'Karlito Macadat', role: 'FACULTY' },
                        { rfidUid: '71394417', name: 'Justine Jay Agbada', role: 'FACULTY' },
                        { rfidUid: '99AA88BB', name: 'System Administrator', role: 'ADMIN' },
                      ]
                  ).map((fac: any) => (
                    <div
                      key={fac.rfidUid}
                      className="flex items-center justify-between py-1 border-b border-white/[0.03] text-[11px]"
                    >
                      <span className="text-slate-300">{fac.name}</span>
                      <span className="font-mono text-purple-300 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/20">
                        0x{fac.rfidUid}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Allows faculty to unlock/lock sessions on the doorway terminal even when cloud network is completely unavailable.
                </p>
              </div>

              {/* Offline Queue & Flush Button */}
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/[0.06] flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] text-slate-400">Buffered Offline Taps:</div>
                  <div className="font-mono text-sm font-bold text-white">
                    {offlineQueue.length} record{offlineQueue.length === 1 ? '' : 's'} queued
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="primary"
                  disabled={offlineQueue.length === 0 || isSyncingOffline}
                  onClick={flushOfflineQueue}
                  leftIcon={<UploadCloud className={`w-3.5 h-3.5 ${isSyncingOffline ? 'animate-spin' : ''}`} />}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                >
                  {isSyncingOffline ? 'Syncing...' : 'Batch Sync to Cloud'}
                </Button>
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



