/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f8fafc', // slate-50
        surface: '#ffffff',
        primary: '#3b82f6', // blue-500
        secondary: '#64748b', // slate-500
        border: '#e2e8f0', // slate-200
        danger: '#ef4444', // red-500
        success: '#22c55e', // green-500
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
