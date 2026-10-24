/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        hud: {
          bg: '#090B0C',
          surface: '#101418',
          card: '#14191E',
          border: '#212830',
          borderMuted: '#192028',
          lime: '#CCFF00',
          limeDark: '#99CC00',
          limeMuted: '#243300',
          red: '#FF3333',
          redMuted: '#3A0D0D',
          amber: '#F59E0B',
          amberMuted: '#382200',
          cyan: '#00F0FF',
          text: '#E6EDF3',
          muted: '#7D8794',
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
        sm: '2px',
        DEFAULT: '2px',
        md: '4px',
        lg: '6px',
      },
    },
  },
  plugins: [],
};
