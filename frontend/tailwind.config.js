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
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF7A00',
          600: '#ea580c',
          700: '#c2410c',
          900: '#9a3412',
        },
        secondary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          500: '#3DDC97',
          600: '#059669',
          700: '#047857',
        },

        turquoise: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#00B4D8',
          600: '#0891b2',
          700: '#0e7490',
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