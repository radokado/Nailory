/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f1115',
        'dark-card': '#161920',
        'dark-card-lighter': '#1e222b',
        'dark-border': '#2a2e39',
        'rose-gold': {
          DEFAULT: '#e6c594',
          light: '#f2dcbe',
          dark: '#cba36b',
        },
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
