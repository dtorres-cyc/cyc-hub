/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: '#161b25',
        bg: '#0f1117',
        border: '#1e2535',
        'status-backlog': '#5a6a84',
        'status-todo': '#3b82f6',
        'status-progress': '#f59e0b',
        'status-review': '#8b5cf6',
        'status-done': '#10b981',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
