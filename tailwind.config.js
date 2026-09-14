/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette fantasy scura: pergamena, ferro, magia viola.
        parchment: '#e8dcc0',
        iron: '#3a3340',
        arcane: '#7c3aed',
        ember: '#e0562d',
        moss: '#4a7c3f',
        blood: '#9b1c2e',
        gold: '#d4af37',
        night: {
          900: '#120a1c',
          800: '#1a1025',
          700: '#241634',
          600: '#2f1d44',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'Georgia', 'serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
