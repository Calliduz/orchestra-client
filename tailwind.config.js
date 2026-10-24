/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#0A0C0E',           // Base canvas background
          surface: '#111418',      // Card & panel surface
          elevated: '#171B20',     // Header strips, elevated panels, inputs
          hover: '#1D2228',        // Hover interactive state
          border: '#22272F',       // Primary hairline border
          subtle: '#181C22',       // Inner dividers & muted lines
          
          // Typography
          text: '#F1F3F5',         // Primary bone white text
          secondary: '#9BA3AF',    // Secondary technical text
          muted: '#5D6673',        // Muted labels, table index, placeholders
          
          // Singular Dominant Accent
          lime: '#CCFF00',
          'lime-dim': '#A3E635',
          'lime-bg': 'rgba(204, 255, 0, 0.08)',
          'lime-border': 'rgba(204, 255, 0, 0.25)',

          // Restrained Semantic Accents
          amber: '#F59E0B',
          'amber-bg': 'rgba(245, 158, 11, 0.08)',
          'amber-border': 'rgba(245, 158, 11, 0.25)',

          rose: '#F87171',
          'rose-bg': 'rgba(248, 113, 113, 0.08)',
          'rose-border': 'rgba(248, 113, 113, 0.25)',

          slate: '#94A3B8',
          'slate-bg': 'rgba(148, 163, 184, 0.08)',
          'slate-border': 'rgba(148, 163, 184, 0.22)',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '2px',
        md: '4px',
      },
    },
  },
  plugins: [],
};
