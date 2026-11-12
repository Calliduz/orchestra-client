import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Clock, Key, AlertCircle, Eye, EyeOff, ArrowLeft, Terminal } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { CopyButton } from '../components/ui/CopyButton.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
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

export const StudentOtpPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [otpData, setOtpData] = useState<OtpData | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isMasked, setIsMasked] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'ORCHESTRA | 60-Second Keypad PIN Fallback';
    if (user?.studentId) {
      setIdentifier(user.studentId);
    }
  }, [user]);

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
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ identifier: targetId.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP generation failed');
      }

      setOtpData(data.data);
      setSecondsRemaining(data.data.expiresInSeconds || 60);
      sounds.playSuccessChime();
      toast.success('Keypad PIN Generated', `PIN: ${data.data.otp} (Valid for 60s)`);
    } catch (err: any) {
      setError(err.message || 'Communication failed');
      sounds.playErrorBuzz();
      toast.error('PIN Request Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await requestOtpForId(identifier);
  };

  const handleBackNavigation = () => {
    if (user?.role === 'STUDENT') {
      navigate('/student/attendance');
    } else if (user?.role === 'ADMIN') {
      navigate('/admin/users');
    } else if (user?.role === 'FACULTY') {
      navigate('/faculty');
    } else {
      navigate('/login');
    }
  };

  const isExpired = otpData && secondsRemaining <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={handleBackNavigation}
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition p-2 rounded-lg hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            {user?.role === 'STUDENT'
              ? 'Back to Student Attendance'
              : user
              ? 'Back to Console'
              : 'Back to Login'}
          </span>
        </button>
      </div>

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
                  placeholder="e.g. 2023-0001-CCS or student@orchestra.edu"
                  className="w-full px-4 py-2.5 border border-slate-700 bg-slate-900/90 text-white focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-xl placeholder:text-slate-500 transition-colors shadow-tactile font-mono text-xs"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-500 dark:text-rose-400 text-xs flex items-center gap-2 rounded-xl shadow-xs">
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
              <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl shadow-tactile">
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 font-bold flex items-center justify-center shrink-0 font-mono text-sm shadow-sm">
                  #
                </div>
                <div>
                  <div className="text-white font-bold text-sm">1. Enter OTP Mode</div>
                  <div className="text-xs text-hud-secondary mt-0.5 leading-relaxed">
                    Press <strong className="text-sky-400 font-mono">#</strong> on the physical 4x4 keypad. The SSD1306 OLED displays <code>[ ENTER OTP ]</code>.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl shadow-tactile">
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center justify-center shrink-0 font-mono text-xs shadow-sm">
                  123
                </div>
                <div>
                  <div className="text-white font-bold text-sm">2. Key In 6 Digits</div>
                  <div className="text-xs text-hud-secondary mt-0.5 leading-relaxed">
                    Enter your 6-digit PIN. Each keypress echoes on the OLED. Press <strong className="text-amber-400 font-mono">*</strong> to backspace or clear.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 bg-slate-900/80 border border-slate-700/80 rounded-xl shadow-tactile">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center shrink-0 font-mono text-sm shadow-sm">
                  #
                </div>
                <div>
                  <div className="text-white font-bold text-sm">3. Submit &amp; Verify</div>
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
              <div
                role="status"
                aria-live="polite"
                className="space-y-4 font-mono text-center"
              >
                {/* 6-Digit PIN Vault Box */}
                <div
                  className={`p-6 border rounded-2xl transition-all shadow-sm ${
                    isExpired
                      ? 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-400'
                      : 'bg-sky-50 border-sky-300 text-sky-900 dark:bg-sky-500/15 dark:border-sky-400/40 dark:text-sky-300 dark:shadow-glow-cyan/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-500 dark:text-hud-secondary">
                      {isExpired ? 'EXPIRED OTP TOKEN' : 'ACTIVE INGRESS PIN'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsMasked((prev) => !prev)}
                      className="inline-flex items-center gap-1 text-[11px] font-sans text-slate-400 hover:text-white px-2 py-0.5 rounded bg-slate-800/80"
                      aria-label={isMasked ? 'Show PIN digits' : 'Mask PIN digits'}
                    >
                      {isMasked ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-amber-400" />}
                      <span>{isMasked ? 'Reveal' : 'Mask'}</span>
                    </button>
                  </div>

                  <div className="text-4xl sm:text-5xl font-mono font-extrabold tracking-widest my-2 num-tabular select-all text-slate-900 dark:text-white">
                    {isMasked ? '••••••' : otpData.otp}
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-4">
                    <CopyButton text={otpData.otp} label="Copy PIN" />
                    <Button
                      size="sm"
                      variant="primary"
                      type="button"
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
                <div className="bg-slate-900/80 border border-slate-700/80 p-3.5 text-xs rounded-xl shadow-tactile">
                  <div className="flex items-center justify-between text-hud-secondary text-xs mb-2">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>TIME REMAINING:</span>
                    </span>
                    <span className="font-bold text-white font-mono num-tabular">
                      {secondsRemaining}s
                    </span>
                  </div>

                  <div className="w-full h-2 bg-slate-800 overflow-hidden rounded-full shadow-inner">
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
                <div className="text-left text-xs space-y-2 text-hud-secondary bg-slate-900/80 border border-slate-700/80 p-4 rounded-xl shadow-tactile font-body">
                  <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                    <span className="text-hud-muted">STUDENT:</span>
                    <span className="text-white font-bold">{otpData.studentName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                    <span className="text-hud-muted">STUDENT ID:</span>
                    <span className="text-white font-mono font-semibold">{otpData.studentId}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-700/60 pb-1.5">
                    <span className="text-hud-muted">SECTION:</span>
                    <span className="text-sky-400 font-bold font-mono">{otpData.sectionCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-hud-muted">TERMINAL NODE:</span>
                    <span className="text-white font-mono">{otpData.terminalId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 space-y-5">
                <div className="p-4 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs rounded-xl space-y-2 font-body">
                  <div className="font-semibold text-white">How Emergency OTP Works:</div>
                  <p className="leading-relaxed">
                    If you misplace your RFID badge, generate a time-limited 6-digit PIN linked directly to your student record. Present this at the room's terminal keypad to register on-time attendance.
                  </p>
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
