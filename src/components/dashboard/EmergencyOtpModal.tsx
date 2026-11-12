import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, Clock, Eye, EyeOff, RefreshCw, Key, Hash, Terminal } from 'lucide-react';
import { Modal } from '../ui/Modal.js';
import { Button } from '../ui/Button.js';
import { CopyButton } from '../ui/CopyButton.js';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { API_V1_URL } from '../../config/api.js';
import { sounds } from '../../utils/audio.js';

interface EmergencyOtpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface OtpPayload {
  otp: string;
  expiresAt: string;
  expiresInSeconds?: number;
  expiresIn?: number;
  sectionCode?: string;
  courseName?: string;
  roomNumber?: string;
  terminalId?: string;
}

export const EmergencyOtpModal: React.FC<EmergencyOtpModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpData, setOtpData] = useState<OtpPayload | null>(null);
  const [totalDuration, setTotalDuration] = useState<number>(60);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [isMasked, setIsMasked] = useState<boolean>(false);

  const requestOtp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const studentIdentifier = user?.studentId || user?.email;
      if (!studentIdentifier) {
        throw new Error('Authenticated student identifier missing.');
      }

      const res = await fetch(`${API_V1_URL}/otp/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          identifier: studentIdentifier,
          studentId: user?.studentId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to mint emergency OTP.');
      }

      const payload: OtpPayload = json.data || json;
      const duration = payload.expiresInSeconds || payload.expiresIn || 60;
      setOtpData(payload);
      setTotalDuration(duration);
      setSecondsRemaining(duration);
      sounds.playSuccessChime();
      toast.success('Emergency PIN Ready', 'Your single-use 6-digit terminal PIN is active.');
    } catch (err: any) {
      setError(err.message || 'Network error requesting emergency PIN.');
      sounds.playErrorBuzz();
      toast.error('PIN Generation Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-request PIN upon initial modal open if not already minted
  useEffect(() => {
    if (isOpen && !otpData && !isLoading) {
      requestOtp();
    }
  }, [isOpen]);

  // Countdown interval
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

  const isExpired = Boolean(otpData && secondsRemaining <= 0);
  const percentRemaining = totalDuration > 0 ? Math.min(100, Math.max(0, (secondsRemaining / totalDuration) * 100)) : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency Keypad PIN Ingress"
      description="Single-use ephemeral passcode for physical terminal check-in without your RFID badge."
      hideFooter
    >
      <div className="space-y-5">
        {/* Anti-Shoulder Surfing & Timer Header */}
        <div className="flex items-center justify-between text-xs text-slate-400 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-1.5 font-mono">
            <Key className="w-3.5 h-3.5 text-sky-400" />
            <span>ID: <strong className="text-white">{user?.studentId || user?.email}</strong></span>
          </div>
          {otpData && (
            <button
              type="button"
              onClick={() => setIsMasked((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs font-mono min-h-[44px]"
              title={isMasked ? 'Reveal PIN' : 'Mask PIN (Anti-Shoulder Surfing)'}
              aria-label={isMasked ? 'Reveal PIN digits' : 'Mask PIN digits to prevent shoulder surfing'}
            >
              {isMasked ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400" />}
              <span>{isMasked ? 'Show PIN' : 'Mask (Anti-Surfing)'}</span>
            </button>
          )}
        </div>

        {/* PIN Container / Status */}
        <div
          role="status"
          aria-live="polite"
          className={`p-5 rounded-2xl border text-center transition-all ${
            isExpired
              ? 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              : 'bg-slate-950/80 border-sky-500/30 text-sky-300 shadow-inner'
          }`}
        >
          {isLoading ? (
            <div className="py-6 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-7 h-7 text-sky-400 animate-spin" />
              <p className="text-xs font-mono text-slate-400 tracking-wider">MINTING INGRESS TOKEN...</p>
            </div>
          ) : error ? (
            <div className="py-4 space-y-3">
              <div className="inline-flex p-2 rounded-full bg-rose-500/20 text-rose-400">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono text-rose-300">{error}</p>
              <Button size="sm" variant="primary" onClick={requestOtp}>
                Retry Generation
              </Button>
            </div>
          ) : otpData ? (
            <div className="space-y-3">
              <div className="text-[11px] font-mono tracking-widest uppercase text-slate-400">
                {isExpired ? 'TOKEN EXPIRED' : 'ACTIVE INGRESS PIN'}
              </div>

              {/* 6-Digit Display */}
              <div
                data-testid="otp-pin-display"
                className="text-4xl sm:text-5xl font-mono font-black tracking-widest text-white selection:bg-sky-500 selection:text-black py-1"
              >
                {isMasked ? '••••••' : otpData.otp}
              </div>

              {/* Decaying Countdown Progress Bar */}
              <div className="space-y-1.5 pt-1">
                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                      percentRemaining > 30 ? 'bg-sky-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${percentRemaining}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Time Remaining:</span>
                  </span>
                  <span className={isExpired ? 'text-rose-400 font-bold' : 'text-sky-300 font-bold'}>
                    {isExpired ? 'EXPIRED' : `${secondsRemaining}s`}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-center gap-2 pt-2">
                <CopyButton text={otpData.otp} label="Copy PIN" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={requestOtp}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                  disabled={isLoading}
                >
                  Regenerate
                </Button>
              </div>
            </div>
          ) : (
            <div className="py-4">
              <Button size="sm" variant="primary" onClick={requestOtp}>
                Generate 6-Digit PIN
              </Button>
            </div>
          )}
        </div>

        {/* Visual 4x4 Keypad Entry Guide */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-white/[0.06] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Hash className="w-3.5 h-3.5 text-sky-400" />
            <span>Terminal Keypad Entry Instructions</span>
          </div>
          <ol className="text-xs text-slate-400 space-y-1.5 font-sans list-decimal list-inside leading-relaxed">
            <li>
              Press <span className="font-mono font-bold text-sky-300 px-1 py-0.5 rounded bg-slate-800 border border-slate-700">#</span> on the physical keypad to activate PIN mode.
            </li>
            <li>
              Key in your 6-digit numeric passcode <span className="font-mono text-slate-300">({isMasked ? '••••••' : otpData?.otp || 'PIN'})</span>.
            </li>
            <li>
              Press <span className="font-mono font-bold text-sky-300 px-1 py-0.5 rounded bg-slate-800 border border-slate-700">#</span> again to submit. Green LED will confirm attendance.
            </li>
          </ol>
        </div>

        <div className="flex items-center justify-end pt-2 border-t border-white/[0.06]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmergencyOtpModal;
