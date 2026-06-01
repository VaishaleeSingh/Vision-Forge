import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aqua: {
          50:  '#f0fdfc',
          100: '#ccfbf7',
          200: '#99f5ef',
          300: '#5eeae4',
          400: '#2dd4cc',
          500: '#0bbfbf',
          600: '#0899a0',
          700: '#0c7a82',
          800: '#0f6169',
          900: '#125059',
        },
        beige: {
          50:  '#fdfcfa',
          100: '#faf7f2',
          200: '#f5ede0',
          300: '#ede0cc',
          400: '#ddc9aa',
          500: '#c8a97a',
          600: '#a07f52',
          700: '#7a5f3a',
          800: '#5a4228',
          900: '#3d2c18',
        },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        aqua:   '0 4px 24px rgba(11, 191, 191, 0.15)',
        'aqua-lg': '0 10px 40px rgba(11, 191, 191, 0.2)',
        glow:   '0 0 30px rgba(11, 191, 191, 0.25)',
      },
      backgroundImage: {
        'aqua-gradient': 'linear-gradient(135deg, #0bbfbf, #0899a0)',
        'beige-gradient': 'linear-gradient(135deg, #faf7f2, #f5ede0)',
        'hero-gradient': 'linear-gradient(135deg, #f0fdfc 0%, #faf7f2 50%, #f0fdfc 100%)',
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'gradient-shift': 'gradient-shift 6s ease infinite',
        'pulse-ring': 'pulse-ring 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease forwards',
        'fade-in': 'fade-in 0.4s ease forwards',
        'shimmer': 'skeleton-shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(11,191,191,0.4)' },
          '70%': { transform: 'scale(1)', boxShadow: '0 0 0 12px rgba(11,191,191,0)' },
          '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(11,191,191,0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'skeleton-shimmer': {
          '0%':   { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}

export default config
