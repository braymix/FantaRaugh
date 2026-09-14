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
        // Look pixel-art "fine": Pixelify Sans è leggibile e non troppo squadrato.
        display: ['"Pixelify Sans"', '"VT323"', 'monospace'],
        body: ['"Pixelify Sans"', '"VT323"', 'ui-monospace', 'monospace'],
      },
      // Angoli quasi netti in tutta l'app: coerenti con l'estetica pixel.
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '2px',
        md: '3px',
        lg: '3px',
        xl: '4px',
        '2xl': '5px',
        '3xl': '6px',
        full: '2px',
      },
      boxShadow: {
        // Ombra "a scalino" tipica dei box retro.
        pixel: '3px 3px 0 0 rgba(0,0,0,0.55)',
      },
    },
  },
  plugins: [],
};
