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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-hud-surface border border-hud-border shadow-2xl p-6 z-10 corner-hud rounded-sm">
        <div className="flex items-start justify-between pb-3 border-b border-hud-border">
          <div>
            <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-hud-text">
              {title}
            </h3>
            {description && (
              <p className="text-[11px] text-hud-secondary mt-1 font-mono tracking-tight">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-hud-border bg-hud-elevated text-hud-secondary hover:text-hud-text hover:border-hud-lime rounded-sm transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-4 text-xs text-hud-text">{children}</div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-hud-border">
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
      </div>
    </div>
  );
};

export default Modal;
