/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#102a43',
        navy: '#0b2638',
        leaf: '#16794c',
        'leaf-dark': '#0d5d39'
      }
    }
  },
  plugins: []
};

