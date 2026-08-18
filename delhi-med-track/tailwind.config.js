/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        delhi: {
          navy: '#0b1d3a',
          blue: '#133e7c',
          sky: '#0284c7',
          emerald: '#059669',
          teal: '#0d9488',
          amber: '#d97706',
          rose: '#e11d48',
          slate: '#0f172a',
          surface: '#f8fafc',
          card: '#ffffff',
          border: '#e2e8f0',
        },
        gov: {
          primary: '#133e7c',
          accent: '#d97706',
          gold: '#f59e0b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'gov': '0 4px 20px -2px rgba(19, 62, 124, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
        'gov-lg': '0 10px 30px -4px rgba(19, 62, 124, 0.12), 0 4px 12px -2px rgba(0, 0, 0, 0.06)',
        'badge': '0 2px 8px rgba(0,0,0,0.06)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
