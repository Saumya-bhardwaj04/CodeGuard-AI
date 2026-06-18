/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#1e1e1e',
        'secondary-dark': '#252526',
        'editor-dark': '#1f1f1f',
        'success': '#4ec9b0',
        'error': '#f48771',
        'warning': '#ffc000',
      },
    },
  },
  plugins: [],
}
