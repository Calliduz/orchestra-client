import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  label?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, label, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      title={`Copy: ${text}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-sm border border-hud-border bg-hud-elevated text-hud-muted hover:border-hud-lime hover:text-hud-lime hover:bg-hud-hover focus:outline-none transition-colors ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-hud-lime" />
          <span className="text-hud-lime">COPIED</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>{label || 'CPY'}</span>
        </>
      )}
    </button>
  );
};
export default CopyButton;
