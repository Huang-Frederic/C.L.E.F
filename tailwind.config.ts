import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFFBFC',
        'paper-raised': '#FBE4EA',
        ink: '#3A2A30',
        'ink-soft': '#7A6169',
        accent: '#B14A6A',
        'accent-dark': '#8F3752',
        warn: '#C0392B',
        line: '#F2D3DD',
      },
      fontFamily: {
        serif: ['var(--font-source-serif)', 'serif'],
        sans: ['var(--font-plex-sans)', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
