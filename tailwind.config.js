/** @type {import('tailwindcss').Config} */
// Paleta i typografia przeniesione z Modulio (github.com/LiteBots/Modulio):
// kremowe tło, ciemna zieleń jako kolor podstawowy, koral jako akcent, Manrope + DM Sans, akcent szeryfowy (Georgia italic).
module.exports = {
  content: ['./views/**/*.ejs', './public/js/**/*.js', './src/**/*.js'],
  theme: {
    extend: {
      colors: {
        // „navy” = ciemna zieleń Modulio (tekst, przyciski główne, ciemne sekcje)
        navy: { 50: '#eef1ef', 100: '#dfe4df', 200: '#c6cfc9', 300: '#a7b3ac', 400: '#7d8a83', 500: '#5f6b65', 600: '#3c4a43', 700: '#2a3832', 800: '#17221d', 900: '#121b17', 950: '#0d1411' },
        // „teal” = zieleń szałwiowa Modulio (linki, ikony, statusy)
        teal: { 50: '#eef4f0', 100: '#dce9e0', 200: '#bfd3c7', 300: '#9dbaa9', 400: '#6f977f', 500: '#4f7560', 600: '#40624f', 700: '#344f40', 800: '#2a4034', 900: '#20322a' },
        // „orange” = koral Modulio
        orange: { 50: '#fff4ec', 100: '#ffe9d9', 200: '#ffd2b0', 300: '#ffb47e', 400: '#ff9a4d', 500: '#ff7b1c', 600: '#ec6a0c', 700: '#c4550a', 800: '#9b440c', 900: '#7d390d' },
        sun: { 50: '#fbf6e6', 100: '#f2e6b8', 200: '#ead690', 300: '#e2c56a', 400: '#d9b347', 500: '#c49a2e', 600: '#a17d22' },
        paper: '#f7f6f2',
        sand: '#efe9dd',
        line: '#dfe4df',
        ink: '#16201c',
        muted: '#5f6b65'
      },
      fontFamily: {
        display: ['Manrope', '"DM Sans"', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        serif: ['Georgia', '"Times New Roman"', 'serif']
      },
      borderRadius: { lg: '14px', xl: '22px', '2xl': '28px', '3xl': '32px' },
      boxShadow: {
        soft: '0 10px 28px rgba(28,42,34,.07)',
        lift: '0 24px 70px rgba(28,42,34,.12)'
      },
      maxWidth: { site: '1280px' }
    }
  },
  plugins: []
};
