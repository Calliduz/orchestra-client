import React from 'react';

export const SkipLink: React.FC = () => {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-3 focus:py-1.5 focus:bg-hud-lime focus:text-black focus:border focus:border-hud-lime font-mono text-xs font-bold rounded-sm shadow-md transition"
    >
      Skip to main content
    </a>
  );
};
export default SkipLink;
