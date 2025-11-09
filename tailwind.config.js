/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#2d7b3e',      // Verde golf (exacto de Stitch)
        secondary: '#1E3A5F',    // Azul oscuro
        accent: '#D4AF37',       // Dorado
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f2',
          200: '#dee3df',
          500: '#6b806f',
          600: '#131613',
          900: '#131613',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        inter: ['Inter', '"Noto Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
