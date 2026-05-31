import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#E91E8C',
          light: '#F48CBB',
          dark: '#B01067',
        },
        safe: '#22C55E',
        moderate: '#F59E0B',
        danger: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      screens: {
        // Mobile-first breakpoints
        xs: '375px',
        sm: '640px',
      },
    },
  },
  plugins: [],
};

export default config;
