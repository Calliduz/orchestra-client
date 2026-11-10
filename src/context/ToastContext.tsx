import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  toast: {
    success: (title: string, message?: string, duration?: number) => void;
    error: (title: string, message?: string, duration?: number) => void;
    info: (title: string, message?: string, duration?: number) => void;
    warning: (title: string, message?: string, duration?: number) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, message?: string, duration: number = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: Toast = { id, type, title, message, duration };

    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Keep at most 5 toasts visible

    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [dismissToast]);

  const toastMethods = {
    success: (title: string, message?: string, duration?: number) => addToast('success', title, message, duration),
    error: (title: string, message?: string, duration?: number) => addToast('error', title, message, duration),
    info: (title: string, message?: string, duration?: number) => addToast('info', title, message, duration),
    warning: (title: string, message?: string, duration?: number) => addToast('warning', title, message, duration),
  };

  return (
    <ToastContext.Provider value={{ toasts, toast: toastMethods, dismissToast }}>
      {children}

      {/* Floating Global Toast Container - Bottom Right to never obstruct top header actions */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col-reverse gap-2.5 max-w-sm w-full pointer-events-none select-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const typeConfig = {
            success: {
              border: 'border-emerald-500/40',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-emerald-950/50 shadow-xl',
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              glow: 'bg-emerald-400',
            },
            error: {
              border: 'border-rose-500/40',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-rose-950/50 shadow-xl',
              icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
              glow: 'bg-rose-400',
            },
            warning: {
              border: 'border-amber-500/40',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-amber-950/50 shadow-xl',
              icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
              glow: 'bg-amber-400',
            },
            info: {
              border: 'border-sky-500/40',
              bg: 'bg-slate-900/95',
              shadow: 'shadow-sky-950/50 shadow-xl',
              icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
              glow: 'bg-sky-400',
            },
          }[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 fade-in ${typeConfig.border} ${typeConfig.bg} ${typeConfig.shadow}`}
            >
              <div className="pt-0.5">{typeConfig.icon}</div>
              <div className="flex-1 min-w-0 pr-1">
                <div className="text-xs font-bold text-white tracking-wide">{t.title}</div>
                {t.message && (
                  <div className="text-[11px] text-slate-300 mt-0.5 leading-relaxed font-sans">{t.message}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/[0.08] transition shrink-0 -mr-1 -mt-1"
                aria-label="Dismiss toast"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
