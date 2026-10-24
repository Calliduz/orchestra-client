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
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-none border border-[#2D3540] bg-[#14191E] text-[#7D8794] hover:border-[#CCFF00] hover:text-[#CCFF00] focus:outline-none transition-colors ${className}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-[#CCFF00]" />
          <span className="text-[#CCFF00]">COPIED</span>
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
