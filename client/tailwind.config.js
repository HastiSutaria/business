/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf8ec',
          100: '#faedc4',
          200: '#f5db8d',
          300: '#efc456',
          400: '#e9ac2e',
          500: '#d99417',
          600: '#b87511',
          700: '#945912',
          800: '#7a4915',
          900: '#673d16',
        },
        silver: {
          50: '#f7f8f9',
          100: '#eceef1',
          200: '#dbe0e5',
          300: '#c0c8d1',
          400: '#9fabb8',
          500: '#8592a1',
          600: '#6c7987',
          700: '#59636f',
          800: '#4c545d',
          900: '#42484f',
        },
        profit: {
          DEFAULT: '#16a34a',
          light: '#22c55e',
          dark: '#15803d',
        },
        loss: {
          DEFAULT: '#dc2626',
          light: '#ef4444',
          dark: '#b91c1c',
        },
        surface: {
          DEFAULT: '#ffffff',
          dark: '#111827',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.08)',
        'card-dark': '0 1px 3px 0 rgba(0,0,0,0.4), 0 1px 2px -1px rgba(0,0,0,0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(12px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
      },
    },
  },
  plugins: [],
};
