/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7c3aed',
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
        },
        accent: {
          DEFAULT: '#6d28d9'
        },
        muted: '#9ca3af'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto'],
      },
      boxShadow: {
        card: '0 6px 18px rgba(15, 23, 42, 0.06)'
      }
    },
  },
  plugins: [],
}