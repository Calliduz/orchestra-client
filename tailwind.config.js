/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hud: {
          bg: 'var(--hud-bg)',
          surface: 'var(--hud-surface)',
          elevated: 'var(--hud-elevated)',
          hover: 'var(--hud-hover)',
          border: 'var(--hud-border)',
          subtle: 'var(--hud-subtle)',

          // Typography
          text: 'var(--hud-text)',
          secondary: 'var(--hud-secondary)',
          muted: 'var(--hud-muted)',

          // Signature Session Hero Ribbon
          'hero-bg': 'var(--hud-hero-bg)',
          'hero-text': 'var(--hud-hero-text)',
          'hero-muted': 'var(--hud-hero-muted)',

          // Primary Signal Accent (Cyan / Sky Induction from Stitch)
          cyan: 'var(--hud-cyan)',
          'cyan-bright': 'var(--hud-cyan-bright)',
          'cyan-bg': 'var(--hud-cyan-bg)',
          'cyan-border': 'var(--hud-cyan-border)',

          // Verified Scan / Present Accent (Emerald)
          lime: 'var(--hud-lime)',
          'lime-dim': 'var(--hud-lime-dim)',
          'lime-bg': 'var(--hud-lime-bg)',
          'lime-border': 'var(--hud-lime-border)',

          // Semantic Status Accents
          amber: 'var(--hud-amber)',
          'amber-bg': 'var(--hud-amber-bg)',
          'amber-border': 'var(--hud-amber-border)',

          rose: 'var(--hud-rose)',
          'rose-bg': 'var(--hud-rose-bg)',
          'rose-border': 'var(--hud-rose-border)',

          slate: 'var(--hud-slate)',
          'slate-bg': 'var(--hud-slate-bg)',
          'slate-border': 'var(--hud-slate-border)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        body: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        tactile: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
        'glow-cyan': '0 0 20px rgba(56, 189, 248, 0.25)',
        'glow-emerald': '0 0 24px rgba(16, 185, 129, 0.30)',
        'glow-rose': '0 0 24px rgba(239, 68, 68, 0.30)',
        'glow-amber': '0 0 20px rgba(245, 158, 11, 0.25)',
      },
    },
  },
  plugins: [],
};
