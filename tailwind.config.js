/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:       '#16a36b',
        'primary-dark':'#064431',
        'primary-light':'#E1F5EE',
      },
    },
  },
  plugins: [],
}
