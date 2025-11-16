/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#2d7b3e',  // Verde golf principal
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          DEFAULT: '#2d7b3e',
        },
        secondary: '#1E3A5F',    // Azul oscuro
        accent: {
          400: '#fbbf24',
          500: '#D4AF37',  // Dorado principal
          600: '#d97706',
          DEFAULT: '#D4AF37',
        },
        navy: {
          700: '#1e3a8a',
          800: '#1E3A5F',  // Azul oscuro principal
          900: '#1e293b',
          DEFAULT: '#1E3A5F',
        },
        gray: {
          50: '#f8f9fa',
          100: '#f1f3f2',
          200: '#dee3df',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b806f',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
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
