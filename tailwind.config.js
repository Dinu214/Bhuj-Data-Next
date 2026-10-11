/** @type {import('tailwindcss').Config} */
module.exports = {
  // Next.js App Router: scan app/, components/, hooks/, context/, utils/
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './context/**/*.{js,ts,jsx,tsx,mdx}',
    './utils/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink:    { DEFAULT: '#211526', soft: '#5B4E62', muted: '#8F8494' },
        paper:  { DEFAULT: '#F8F3ED', dark: '#EFE7DB' },
        surface: { DEFAULT: '#FFFFFF', line: '#ECE2D8', soft: '#F1E9DF' },
        maroon: { DEFAULT: '#7C2D3B', dark: '#4E1B26', soft: '#F1DFE2' },
        marigold: { DEFAULT: '#E39A2D', soft: '#FBEACB' },
        sage:   { DEFAULT: '#4C7A63', soft: '#DEEAE3' },
        rose:   { DEFAULT: '#C1544A', soft: '#F4DEDA' },
        dusk:   { DEFAULT: '#48527A', soft: '#E2E3EE' },
        plum:   { DEFAULT: '#8B5E83', soft: '#EEE1EB' },
      },
      borderRadius: {
        xl:  '14px',
        '2xl': '20px',
        '3xl': '26px',
        dock: '22px',
      },
      boxShadow: {
        card:  '0 10px 28px rgba(33,21,38,.07), 0 2px 6px rgba(33,21,38,.04)',
        float: '0 18px 34px -10px rgba(33,21,38,.35)',
        modal: '0 20px 60px -10px rgba(33,21,38,.22)',
      },
    },
  },
  plugins: [],
};
