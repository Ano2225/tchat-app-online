/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        ui: ['Outfit', 'system-ui', 'sans-serif'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#F5F2FF',
          100: '#EDE8FF',
          500: '#7C5AF6',
          600: '#6B47F5',
          700: '#5535D4',
          900: '#2D1B8E',
        },
        secondary: {
          50: '#F5F2FF',
          100: '#EDE8FF',
          500: '#A78BFA',
          600: '#9370F5',
          700: '#7C5AF6',
        },
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        nocturne: {
          base: '#09090F',
          panel: '#0F0F1A',
          surface: '#151524',
          elevated: '#1C1C30',
          hover: '#22223A',
          border: '#242440',
        },
        neutral: {
          light: '#D0D0E8',
          medium: '#7878A8',
          bg: '#F0F0F8',
          dark: '#09090F',
        },
        light: {
          bg: '#F0F0F8',
          card: '#FFFFFF',
          text: '#0F0F28',
        },
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shimmer': 'shimmer 2s infinite',
        'chat-in': 'chatIn 0.38s cubic-bezier(0.34, 1.4, 0.64, 1) both',
        'msg-right': 'msgRight 0.22s ease-out both',
        'msg-left': 'msgLeft 0.22s ease-out both',
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        chatIn: {
          '0%': { transform: 'translateY(24px) scale(0.96)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
        msgRight: {
          '0%': { transform: 'translateX(10px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        msgLeft: {
          '0%': { transform: 'translateX(-10px) scale(0.95)', opacity: '0' },
          '100%': { transform: 'translateX(0) scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}
