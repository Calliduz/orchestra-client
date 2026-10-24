import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldAlert, Clock, RefreshCw, Key, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card.js';
import { Button } from '../components/ui/Button.js';
import { CopyButton } from '../components/ui/CopyButton.js';

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

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please specify your Student ID or institutional email.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('http://localhost:5000/api/v1/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'OTP generation failed');
      }

      setOtpData(data.data);
      setSecondsRemaining(data.data.expiresInSeconds || 60);
    } catch (err: any) {
      setError(err.message || 'Communication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const isExpired = otpData && secondsRemaining <= 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header Banner */}
      <div className="border-b border-[#1E2632] pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-bold text-2xl text-[#F1F5F9] tracking-tight">
              Student Keypad PIN Generator
            </h1>
            <span className="text-[10px] font-mono font-semibold bg-[#0A1A24] text-[#38BDF8] border border-[#16445E] px-2 py-0.5">
              60s TTL Interlock
            </span>
          </div>
          <p className="text-xs text-[#8C98A8] mt-1 font-mono">
            Physical badge unavailable? Generate an ephemeral 6-digit PIN for 4x4 hardware keypad entry.
          </p>
        </div>

        <div className="text-right text-[11px] font-mono text-[#8C98A8]">
          <span>TARGET TERMINAL: </span>
          <span className="text-[#CCFF00] font-bold">TERM-CL304 (LAB-304)</span>
        </div>
      </div>

      {/* Asymmetric 60 / 40 Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 60% Left: Request Form & Anti-Proxy Notice */}
        <div className="lg:col-span-7 space-y-6">
          <Card
            title="Request Ingress PIN"
            subtitle="Requires active class session in your enrolled section"
          >
            <form onSubmit={handleRequestOtp} className="space-y-4 text-xs font-mono">
              <div>
                <label
                  htmlFor="identifier-input"
                  className="block text-[11px] font-medium text-[#8C98A8] uppercase tracking-wider mb-1.5"
                >
                  Student ID or Institutional Email
                </label>
                <input
                  id="identifier-input"
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 2023-0001-CCS or altichie.rjhay@student.orchestra.edu"
                  className="w-full px-3 py-2 border border-[#1E2632] bg-[#0A0D12] text-[#E2E8F0] focus:outline-none focus:border-[#CCFF00] rounded-none placeholder:text-[#525F70]"
                />
                <div className="flex flex-wrap gap-2 text-[10px] text-[#7E8B9B] mt-2">
                  <span>PRESETS:</span>
                  <button type="button" onClick={() => setIdentifier('2023-0001-CCS')} className="text-[#CCFF00] hover:underline">
                    2023-0001-CCS (Agbada)
                  </button>
                  <span className="text-[#3E4A5B]">•</span>
                  <button type="button" onClick={() => setIdentifier('2023-0002-CCS')} className="text-[#CCFF00] hover:underline">
                    2023-0002-CCS (Altichie)
                  </button>
                  <span className="text-[#3E4A5B]">•</span>
                  <button type="button" onClick={() => setIdentifier('2023-0003-CCS')} className="text-[#CCFF00] hover:underline">
                    2023-0003-CCS (Cabunoc)
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-[#220B0B] border border-[#4A1515] text-[#F87171] text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                isLoading={isLoading}
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              >
                Generate 60-Second PIN
              </Button>
            </form>
          </Card>

          {/* Hardware Keypad Operation Instructions */}
          <Card
            title="Terminal Keypad Procedure"
            subtitle="Step-by-step physical entry on the classroom 4x4 matrix unit"
          >
            <div className="space-y-3 font-mono text-xs text-[#8C98A8]">
              <div className="flex items-start gap-3 p-2.5 bg-[#0A0D12] border border-[#1E2632]">
                <div className="w-6 h-6 rounded-none bg-[#141B24] border border-[#232D3B] text-[#CCFF00] font-bold flex items-center justify-center shrink-0 text-xs">
                  #
                </div>
                <div>
                  <div className="text-[#F1F5F9] font-medium">1. Enter OTP Mode</div>
                  <div className="text-[11px] text-[#6A7888] mt-0.5">
                    Press <strong className="text-[#CCFF00]">#</strong> on the physical 4x4 keypad. The SSD1306 OLED will switch to <code>[ ENTER OTP ]</code> mode.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-[#0A0D12] border border-[#1E2632]">
                <div className="w-6 h-6 rounded-none bg-[#141B24] border border-[#232D3B] text-[#38BDF8] font-bold flex items-center justify-center shrink-0 text-xs">
                  123
                </div>
                <div>
                  <div className="text-[#F1F5F9] font-medium">2. Key In 6 Digits</div>
                  <div className="text-[11px] text-[#6A7888] mt-0.5">
                    Enter the 6-digit PIN displayed on your device. Each keypress echoes a bullet on the OLED. Use <strong className="text-[#F59E0B]">*</strong> to backspace or clear.
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 bg-[#0A0D12] border border-[#1E2632]">
                <div className="w-6 h-6 rounded-none bg-[#141B24] border border-[#232D3B] text-[#CCFF00] font-bold flex items-center justify-center shrink-0 text-xs">
                  #
                </div>
                <div>
                  <div className="text-[#F1F5F9] font-medium">3. Submit &amp; Verify</div>
                  <div className="text-[11px] text-[#6A7888] mt-0.5">
                    Press <strong className="text-[#CCFF00]">#</strong> again to dispatch HTTP POST to backend. Successful verification emits high piezo chime + green LED.
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
            subtitle="Ephemeral single-use credential for terminal ingress"
          >
            {otpData ? (
              <div className="space-y-4 font-mono text-center">
                {/* 6-Digit PIN Vault Box */}
                <div
                  className={`p-6 border ${
                    isExpired
                      ? 'bg-[#220B0B]/40 border-[#4A1515] text-[#6A7888]'
                      : 'bg-[#12200A]/40 border-[#29420D] text-[#CCFF00] shadow-[0_0_20px_rgba(204,255,0,0.12)]'
                  }`}
                >
                  <div className="text-[10px] text-[#8C98A8] uppercase tracking-wider mb-2">
                    {isExpired ? 'EXPIRED OTP TOKEN' : 'ACTIVE INGRESS PIN'}
                  </div>

                  <div className="text-4xl sm:text-5xl font-mono font-bold tracking-widest my-2 num-tabular select-all">
                    {otpData.otp}
                  </div>

                  <div className="flex items-center justify-center gap-2 mt-3">
                    <CopyButton text={otpData.otp} label="Copy 6-Digit PIN" />
                  </div>
                </div>

                {/* Decaying Circular/Bar Timer */}
                <div className="bg-[#0A0D12] border border-[#1E2632] p-3 text-xs">
                  <div className="flex items-center justify-between text-[#8C98A8] text-[11px] mb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
                      <span>TIME TO EXPIRATION:</span>
                    </span>
                    <span className="font-bold text-[#F1F5F9] num-tabular">
                      {secondsRemaining}s
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-[#141B24] overflow-hidden">
                    <div
                      style={{ width: `${(secondsRemaining / 60) * 100}%` }}
                      className={`h-full transition-all duration-1000 ${
                        secondsRemaining > 20
                          ? 'bg-[#CCFF00]'
                          : secondsRemaining > 10
                          ? 'bg-[#F59E0B]'
                          : 'bg-[#EF4444]'
                      }`}
                    />
                  </div>
                </div>

                {/* Student Manifest Context */}
                <div className="text-left text-[11px] space-y-1.5 text-[#8C98A8] bg-[#0A0D12] border border-[#1E2632] p-3">
                  <div className="flex justify-between border-b border-[#171E28] pb-1">
                    <span>STUDENT:</span>
                    <span className="text-[#F1F5F9] font-medium">{otpData.studentName}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#171E28] pb-1">
                    <span>STUDENT ID:</span>
                    <span className="text-[#CBD5E1]">{otpData.studentId}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#171E28] pb-1">
                    <span>SECTION:</span>
                    <span className="text-[#CCFF00] font-bold">{otpData.sectionCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TERMINAL NODE:</span>
                    <span className="text-[#F1F5F9]">{otpData.terminalId}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 px-4 text-center text-[#6A7888] font-mono space-y-3">
                <Key className="w-8 h-8 mx-auto text-[#3E4A5B]" />
                <p className="text-xs">
                  No active OTP requested. Enter your Student ID on the left to generate a 60-second hardware entry PIN.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentOtpPage;
