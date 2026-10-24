/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#090D14',           // Deep rich dark canvas (gentle on eyes)
          surface: '#0F1523',      // Primary card and panel surface
          elevated: '#171F32',     // Inputs, modals, elevated surfaces
          hover: '#1E2942',        // Interactive hover state
          border: 'rgba(255, 255, 255, 0.08)', // Soft, subtle hairline boundary
          subtle: 'rgba(255, 255, 255, 0.04)', // Minimal inner divider
          
          // Typography
          text: '#F8FAFC',         // Crisp, clear primary text
          secondary: '#94A3B8',    // Readable secondary technical text
          muted: '#64748B',        // Muted captions & placeholders
          
          // Primary Mint/Lime Tech Accent (Pleasing, high-legibility, no eye-strain)
          lime: '#10B981',
          'lime-dim': '#059669',
          'lime-bg': 'rgba(16, 185, 129, 0.12)',
          'lime-border': 'rgba(16, 185, 129, 0.28)',

          // Semantic Status Accents (Softened)
          amber: '#F59E0B',
          'amber-bg': 'rgba(245, 158, 11, 0.12)',
          'amber-border': 'rgba(245, 158, 11, 0.28)',

          rose: '#F43F5E',
          'rose-bg': 'rgba(244, 63, 94, 0.12)',
          'rose-border': 'rgba(244, 63, 94, 0.28)',

          slate: '#94A3B8',
          'slate-bg': 'rgba(148, 163, 184, 0.10)',
          'slate-border': 'rgba(148, 163, 184, 0.20)',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
    },
  },
  plugins: [],
};
