/** @type {import('tailwindcss').Config} */
const c = (n) => `rgb(var(--c-${n}) / <alpha-value>)`
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { paper: c('paper'), home: c('home'), stone: c('stone'), ink: c('ink'), soot: c('soot') },
      fontFamily: {
        display: ['var(--font-display)', 'Helvetica Neue', 'sans-serif'],
        sans: ['var(--font-body)', 'Helvetica Neue', 'sans-serif'],
      },
      letterSpacing: { label: '.14em', tight2: '-.045em' },
    },
  },
  plugins: [],
}
