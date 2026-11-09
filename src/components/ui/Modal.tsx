import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button.js';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: 'primary' | 'danger' | 'secondary';
  onConfirm?: () => void;
  isLoading?: boolean;
  hideFooter?: boolean;
  showFooter?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  confirmLabel = 'CONFIRM',
  confirmVariant = 'primary',
  onConfirm,
  isLoading = false,
  hideFooter = false,
  showFooter = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const renderFooter = !hideFooter && (showFooter || Boolean(onConfirm));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-white/[0.08] shadow-2xl p-6 z-10 rounded-2xl">
        <div className="flex items-start justify-between pb-3.5 border-b border-white/[0.06]">
          <div>
            <h3 className="font-sans font-extrabold text-base tracking-tight text-white">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-slate-400 mt-1 font-body">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.04] rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 text-sm text-slate-200">{children}</div>

        {renderFooter && (
          <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-white/[0.06]">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            {onConfirm && (
              <Button
                variant={confirmVariant}
                size="sm"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
