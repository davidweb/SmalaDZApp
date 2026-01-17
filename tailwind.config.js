
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        game: ['Bangers', 'cursive'],
        sans: ['Outfit', 'sans-serif'],
      },
      backgroundImage: {
        'dz-gradient': 'linear-gradient(135deg, #006233 0%, #ffffff 50%, #d21034 100%)',
      }
    },
  },
  plugins: [],
}
