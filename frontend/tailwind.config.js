/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
        secondary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
        },

        accent: {
          50: '#fdf4ff',
          100: '#fae8ff',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed',
        },
        neutral: {
          light: '#E0E0E0',
          medium: '#7A7A7A',
          bg: '#F9F9F9',
          dark: '#1C1C1E',
        },
        light: {
          bg: '#FFFFFF',
          card: '#F8FAFC',
          text: '#1F2937',
        },
      },
    },
  },
  plugins: [],
}