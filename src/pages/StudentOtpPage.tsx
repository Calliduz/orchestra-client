import React, { useState, useEffect } from 'react';
import { KeyRound, Clock, Key, AlertCircle, Shield, Terminal, Zap } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { CopyButton } from '../components/ui/CopyButton.js';
import { API_V1_URL } from '../config/api.js';
import { sounds } from '../utils/audio.js';

interface OtpData {
  otp: string;
  expiresAt: string;
  expiresInSeconds: number;
  studentId: string;
  studentName: string;
  sectionCode: string;
  courseName: string;
  roomNumber: string;
  terminalId: string;
}

const STUDENT_PRESETS = [
  { id: '2023-0001-CCS', name: 'Agbada, Justine Jay', initials: 'JA' },
  { id: '2023-0002-CCS', name: 'Altichie, Rjhay', initials: 'RA' },
  { id: '2023-0003-CCS', name: 'Cabunoc, Rey', initials: 'RC' },
  { id: '2023-0004-CCS', name: 'Dalupang, John Mark', initials: 'JD' },
  { id: '2023-0005-CCS', name: 'Malate, Christian Dave', initials: 'CM' },
];

export const StudentOtpPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpData | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'ORCHESTRA | 60-Second Keypad PIN Fallback';
  }, []);

  useEffect(() => {
    if (!otpData?.expiresAt) return;

    const expiryTime = new Date(otpData.expiresAt).getTime();

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
      setSecondsRemaining(diff);

      if (diff <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [otpData]);

  const requestOtpForId = async (targetId: string) => {
    setIdentifier(targetId);
    if (!targetId.trim()) {
      setError('Please specify your Student ID or institutional email.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_V1_URL}/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: targetId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP generation failed');
      }

      setOtpData(data.data);
      setSecondsRemaining(data.data.expiresInSeconds || 60);
      sounds.playSuccessChime();
    } catch (err: any) {
      setError(err.message || 'Communication failed');
      sounds.playErrorBuzz();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtpForId(identifier);
  };

  const isExpired = otpData && secondsRemaining <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="border-b border-hud-border/80 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-sans font-extrabold text-2xl text-hud-text tracking-tight">
              Student Keypad PIN Ingress Portal
            </h1>
            <span className="text-[11px] font-sans font-bold uppercase tracking-wider bg-sky-500/15 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full shadow-sm">
              60s Ephemeral TTL
            </span>
          </div>
          <p className="text-xs text-hud-secondary mt-1 font-body">
            Physical student badge unavailable? Generate an ephemeral 6-digit induction PIN for terminal keypad entry.
          </p>
        </div>

        <div className="text-right text-xs font-mono text-hud-secondary bg-hud-surface border border-hud-border/70 px-3.5 py-2 rounded-xl shadow-tactile">
          <span className="text-hud-muted">TARGET: </span>
          <span className="text-sky-400 font-bold">TERM-CL304 (LAB-304)</span>
        </div>
      </div>

      {/* Asymmetric 60 / 40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 60% Left: Request Form & Anti-Proxy Notice */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Request Terminal Ingress PIN"
            subtitle="Requires active class session in your enrolled section"
          >
            <form onSubmit={handleRequestOtp} className="space-y-4 text-xs font-body">
              <div>
                <label
                  htmlFor="identifier-input"
                  className="block text-xs font-semibold text-hud-secondary uppercase tracking-wider mb-2"
                >
                  Student ID or Institutional Email
                </label>
                <input
                  id="identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 2023-0001-CCS or altichie.rjhay@student.orchestra.edu"
                  className="w-full px-4 py-2.5 border border-hud-border/80 bg-hud-elevated/70 text-hud-text focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl placeholder:text-hud-muted transition-colors shadow-tactile font-mono text-xs"
                />
                <div className="space-y-2 mt-3">
                  <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-hud-secondary">
                    Enrolled Student Presets:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 font-body">
                    {STUDENT_PRESETS.map((p) => {
                      const isSelected = identifier === p.id;
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                            isSelected
                              ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-sm'
                              : 'border-hud-border/70 bg-hud-elevated/40 hover:bg-hud-hover text-hud-secondary hover:text-hud-text'
                          }`}
                        >
                          <div
                            onClick={() => setIdentifier(p.id)}
                            className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                          >
                            <span className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                              {p.initials}
                            </span>
                            <div className="truncate">
                              <div className="font-semibold text-xs leading-none text-hud-text truncate">
                                {p.name}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                {p.id}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => requestOtpForId(p.id)}
                            title="1-Click Mint OTP PIN"
                            className="p-1.5 ml-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-600 text-sky-500 dark:text-sky-400 hover:text-white transition-all shrink-0 text-[10px] font-bold flex items-center gap-1 border border-sky-500/25"
                          >
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span>Mint</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 rounded-xl shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full shadow-md"
                isLoading={isLoading}
                leftIcon={<KeyRound className="w-4 h-4" />}
              >
                Generate 60-Second Ingress PIN
              </Button>
            </form>
          </Card>

          {/* Hardware Keypad Operation Instructions */}
          <Card
            title="Terminal Keypad Procedure"
            subtitle="Physical entry guide for the classroom 4x4 matrix unit"
          >
            <div className="space-y-3 font-body text-xs text-hud-secondary">
              <div className="flex items-start gap-3.5 p-3.5 bg-hud-elevated/50 border border-hud-border/70 rounded-xl shadow-tactile">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold flex items-center justify-center shrink-0 font-mono text-sm shadow-sm">
                  #
                </div>
                <div>
                  <div className="text-hud-text font-bold text-sm">1. Enter OTP Mode</div>
                  <div className="text-xs text-hud-secondary mt-0.5 leading-relaxed">
                    Press <strong className="text-sky-400 font-mono">#</strong> on the physical 4x4 keypad. The SSD1306 OLED displays <code>[ ENTER OTP ]</code>.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-hud-elevated/50 border border-hud-border/70 rounded-xl shadow-tactile">
                <div className="w-7 h-7 rounded-lg bg-hud-elevated border border-hud-border text-hud-text font-bold flex items-center justify-center shrink-0 font-mono text-xs shadow-sm">
                  123
                </div>
                <div>
                  <div className="text-hud-text font-bold text-sm">2. Key In 6 Digits</div>
                  <div className="text-xs text-hud-secondary mt-0.5 leading-relaxed">
                    Enter your 6-digit PIN. Each keypress echoes on the OLED. Press <strong className="text-amber-400 font-mono">*</strong> to backspace or clear.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-hud-elevated/50 border border-hud-border/70 rounded-xl shadow-tactile">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center shrink-0 font-mono text-sm shadow-sm">
                  #
                </div>
                <div>
                  <div className="text-hud-text font-bold text-sm">3. Submit &amp; Verify</div>
                  <div className="text-xs text-hud-secondary mt-0.5 leading-relaxed">
                    Press <strong className="text-emerald-400 font-mono">#</strong> again to dispatch verification. Successful ingress triggers piezobuzzer chime + green status LED.
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* 40% Right: Dynamic Decaying PIN Display */}
        <div className="lg:col-span-5 space-y-6">
          <Card
            title="Generated Ingress Credential"
            subtitle="Single-use ephemeral token for terminal ingress"
          >
            {otpData ? (
              <div className="space-y-4 font-mono text-center">
                {/* 6-Digit PIN Vault Box with High Contrast and Radiant Luminous Halo */}
                <div
                  className={`p-6 border rounded-2xl transition-all shadow-sm ${
                    isExpired
                      ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400'
                      : 'bg-sky-50 border-sky-300 text-sky-900 dark:bg-sky-500/15 dark:border-sky-400/40 dark:text-sky-300 dark:shadow-glow-cyan/25'
                  }`}
                >
                  <div className="text-[11px] font-sans font-bold uppercase tracking-wider mb-2 text-slate-500 dark:text-hud-secondary">
                    {isExpired ? 'EXPIRED OTP TOKEN' : 'ACTIVE INGRESS PIN'}
                  </div>

                  <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-widest my-2 num-tabular select-all text-slate-900 dark:text-white">
                    {otpData.otp}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                    <CopyButton text={otpData.otp} label="Copy PIN" />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        localStorage.setItem('orchestra_ingress_otp', otpData.otp);
                        window.dispatchEvent(
                          new CustomEvent('orchestra:test_keypad', { detail: { otp: otpData.otp } })
                        );
                      }}
                      leftIcon={<Terminal className="w-3.5 h-3.5" />}
                      className="w-full sm:w-auto shadow-sm"
                    >
                      Test on Keypad Terminal →
                    </Button>
                  </div>
                </div>

                {/* Decaying Bar Timer */}
                <div className="bg-hud-elevated/50 border border-hud-border/70 p-3.5 text-xs rounded-xl shadow-tactile">
                  <div className="flex items-center justify-between text-hud-secondary text-xs mb-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>TIME REMAINING:</span>
                    </span>
                    <span className="font-bold text-hud-text font-mono num-tabular">
                      {secondsRemaining}s
                    </span>
                  </div>

                  <div className="w-full h-2 bg-hud-elevated overflow-hidden rounded-full shadow-inner">
                    <div
                      style={{ width: `${(secondsRemaining / 60) * 100}%` }}
                      className={`h-full transition-all duration-1000 ${
                        secondsRemaining > 20
                          ? 'bg-sky-500'
                          : secondsRemaining > 10
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Student Manifest Context */}
                <div className="text-left text-xs space-y-2 text-hud-secondary bg-hud-elevated/40 border border-hud-border/70 p-4 rounded-xl shadow-tactile font-body">
                  <div className="flex justify-between border-b border-hud-subtle pb-1.5">
                    <span className="text-hud-muted">STUDENT:</span>
                    <span className="text-hud-text font-bold">{otpData.studentName}</span>
                  </div>
                  <div className="flex justify-between border-b border-hud-subtle pb-1.5">
                    <span className="text-hud-muted">STUDENT ID:</span>
                    <span className="text-hud-text font-mono font-semibold">{otpData.studentId}</span>
                  </div>
                  <div className="flex justify-between border-b border-hud-subtle pb-1.5">
                    <span className="text-hud-muted">SECTION:</span>
                    <span className="text-sky-400 font-bold font-mono">{otpData.sectionCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-hud-muted">TERMINAL NODE:</span>
                    <span className="text-hud-text font-mono">{otpData.terminalId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 space-y-5">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shadow-glow-cyan/20">
                  <Shield className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1">
                  <h4 className="font-sans font-bold text-sm text-hud-text">
                    Hardware Ingress Guard Active
                  </h4>
                  <p className="text-xs text-hud-secondary font-body">
                    Select an enrolled student preset on the left or enter a Student ID to mint a single-use 60-second induction token.
                  </p>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-hud-border/60 text-xs font-body text-hud-secondary">
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-hud-text">60-Second TTL Nonce:</strong> Automatically decays and expires after 60 seconds to defeat token reuse.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-hud-text">Single-Use Consumption:</strong> The token is burned immediately upon successful terminal ingress.
                    </span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>
                      <strong className="text-hud-text">3-Strike Lockout:</strong> Keypad locks for 180s on 3 consecutive invalid PIN entries.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentOtpPage;
