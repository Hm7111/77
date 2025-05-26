/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          50: '#f0f7ff',
          100: '#e0eefe',
          200: '#b9ddfe',
          300: '#7cc2fd',
          400: '#36a9fa',
          500: '#0c91eb',
          600: '#0070cc',
          700: '#0058a3',
          800: '#004a87',
          900: '#003f71',
          950: '#002851'
        },
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}