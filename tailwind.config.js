/** @type {import('tailwindcss').Config} */
// Paleta i typografia z logo NieruchomosciPomorza.pl (granat, niebieski, pomarańcz, bursztyn, morski) + Plus Jakarta Sans.
module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        // Kolory z logo NieruchomosciPomorza: granat (navy), niebieski (teal), pomarańcz (orange), bursztyn (sun), morski (sea)
        navy: { 50: '#eef2f7', 100: '#dce4ee', 200: '#b9c8da', 300: '#8ea5bf', 400: '#5e7c9d', 500: '#3e5f82', 600: '#2b4b6e', 700: '#1e3d5e', 800: '#14304f', 900: '#0f2640', 950: '#0a1b2e' },
        teal: { 50: '#eaf3fa', 100: '#d3e6f4', 200: '#a9cde8', 300: '#78afd8', 400: '#4a90c4', 500: '#2a6fa8', 600: '#225d8e', 700: '#1c4c75', 800: '#173d5e', 900: '#12304a' },
        orange: { 50: '#fdf1eb', 100: '#fbe2d5', 200: '#f6c3a8', 300: '#f1a07a', 400: '#ec8656', 500: '#e8703a', 600: '#d35d28', 700: '#b04a1e', 800: '#8c3b1a', 900: '#6f3018' },
        sun: { 50: '#fef7ea', 100: '#fcebc8', 200: '#f9d995', 300: '#f5c566', 400: '#f0aa3c', 500: '#dd9324', 600: '#b8771b' },
        sea: { 100: '#e3f0ef', 300: '#a9cfcd', 500: '#7db4b1', 700: '#4e8682' },
        paper: '#f6f5f0',
        sand: '#ece8de',
        line: '#e2e0d8',
        ink: '#14304f',
        muted: '#5b6875'
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif']
      },
      borderRadius: { lg: '14px', xl: '22px', '2xl': '28px', '3xl': '32px' },
      boxShadow: {
        soft: '0 10px 28px rgba(20,48,79,.07)',
        lift: '0 24px 70px rgba(20,48,79,.13)'
      },
      maxWidth: { site: '1280px' }
    }
  },
  plugins: []
};
