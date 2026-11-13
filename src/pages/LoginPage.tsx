import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Shield, KeyRound, Mail, ArrowRight, UserCheck, AlertCircle, Sparkles, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { API_V1_URL } from '../config/api.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeQuickEmail, setActiveQuickEmail] = useState<string | null>(null);

  const executeAuth = async (authEmail: string, authPass: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_V1_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPass }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid credentials');
      }

      const { token, user } = data.data;
      login(token, user);
      toast.success('Welcome Back', `Authenticated as ${user.firstName} ${user.lastName} (${user.role}).`);

      // Role-safe destination routing
      const from = (location.state as any)?.from?.pathname;
      const isValidFrom = from && from !== '/login' && from !== '/';

      if (isValidFrom) {
        if (from.startsWith('/admin') && user.role === 'ADMIN') {
          navigate(from, { replace: true });
          return;
        }
        if (from.startsWith('/faculty') && (user.role === 'FACULTY' || user.role === 'ADMIN')) {
          navigate(from, { replace: true });
          return;
        }
        if (from.startsWith('/student') && (user.role === 'STUDENT' || user.role === 'ADMIN')) {
          navigate(from, { replace: true });
          return;
        }
      }

      if (user.role === 'ADMIN') {
        navigate('/admin/users', { replace: true });
      } else if (user.role === 'FACULTY') {
        navigate('/faculty', { replace: true });
      } else {
        navigate('/student/attendance', { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
      setActiveQuickEmail(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeAuth(email, password);
  };

  const handleQuickLogin = async (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Password123!');
    setActiveQuickEmail(presetEmail);
    await executeAuth(presetEmail, 'Password123!');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient decorative glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-lg shadow-blue-500/25 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">ORCHESTRA</h1>
          <p className="text-slate-400 text-sm mt-1">IoT Classroom Attendance & Trust Framework</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white">Console Authentication</h2>
            <p className="text-xs text-slate-400 mt-1">Sign in to access your designated faculty or admin console</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 text-red-400 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Institutional Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="faculty@orchestra.edu"
                  required
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-slate-950/60 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 text-sm transition-all duration-150 disabled:opacity-50"
            >
              {isLoading && !activeQuickEmail ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials — Admin only */}
          <div className="mt-8 pt-6 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Click Quick Login Profiles:</span>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => handleQuickLogin('admin@orchestra.edu')}
                className="text-left p-2.5 rounded-lg bg-slate-950/50 hover:bg-slate-800/80 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between group disabled:opacity-60"
              >
                <div>
                  <div className="text-xs font-semibold text-white group-hover:text-purple-400 flex items-center gap-2">
                    <span>System Administrator</span>
                    {activeQuickEmail === 'admin@orchestra.edu' && (
                      <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">admin@orchestra.edu &bull; Pass: Password123!</div>
                </div>
                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  ADMIN
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-6">
          <Link
            to="/otp"
            className="text-xs text-slate-400 hover:text-white transition underline underline-offset-4"
          >
            Forgot badge? Go to Student Keypad OTP Ingress &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
};
