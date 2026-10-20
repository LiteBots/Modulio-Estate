/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        navy: { 50: '#eef2f8', 100: '#dbe3ef', 200: '#b5c4dc', 300: '#8aa0c4', 400: '#5a76a3', 500: '#36558a', 600: '#264372', 700: '#1f3963', 800: '#18325a', 900: '#0f2240', 950: '#0b1830' },
        teal: { 50: '#ecf6f5', 100: '#d3ebe9', 200: '#a8d6d3', 300: '#77bcb8', 400: '#4fa3a0', 500: '#37908f', 600: '#2c7676', 700: '#255f60', 800: '#1f4b4c', 900: '#183a3b' },
        orange: { 50: '#fdf2ec', 100: '#fbe1d3', 200: '#f6c1a5', 300: '#f19c71', 400: '#ec824e', 500: '#e9733b', 600: '#cf5c25', 700: '#a9481d', 800: '#863a19', 900: '#6c3117' },
        sun: { 50: '#fef7ea', 100: '#fdebc8', 200: '#fad690', 300: '#f7c063', 400: '#f4a942', 500: '#e8901f', 600: '#c47215' },
        paper: '#f7f6f2',
        sand: '#efece4',
        line: '#e5e2da',
        ink: '#18325a',
        muted: '#6b7488'
      },
      fontFamily: {
        display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: { '4xl': '2rem', '5xl': '2.5rem' },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(24,50,90,.18)',
        lift: '0 24px 50px -20px rgba(24,50,90,.30)'
      },
      maxWidth: { site: '1320px' }
    }
  },
  plugins: []
};
