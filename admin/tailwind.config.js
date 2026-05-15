/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(147, 51, 234, 0)',
          },
          '50%': {
            boxShadow: '0 0 16px 4px rgba(147, 51, 234, 0.45)',
          },
        },
        pulseRedGlow: {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(239, 68, 68, 0)',
          },
          '50%': {
            boxShadow: '0 0 12px 3px rgba(239, 68, 68, 0.5)',
          },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        slideIn: 'slideIn 0.3s ease-out forwards',
        fadeIn: 'fadeIn 0.25s ease-out forwards',
        pulseGlow: 'pulseGlow 2s ease-in-out infinite',
        pulseRedGlow: 'pulseRedGlow 1.5s ease-in-out infinite',
        scaleIn: 'scaleIn 0.2s ease-out forwards',
        spin: 'spin 0.8s linear infinite',
      },
      colors: {
        brand: {
          purple: '#9333ea',
          'purple-light': '#c084fc',
          'purple-dim': 'rgba(147,51,234,0.12)',
        },
        surface: {
          base: '#0a0a0a',
          card: '#141414',
          elevated: '#1c1c1c',
        },
        content: {
          primary: '#f0f0f0',
          secondary: '#a0a0a0',
          muted: '#555555',
        },
      },
    },
  },
  plugins: [],
}
