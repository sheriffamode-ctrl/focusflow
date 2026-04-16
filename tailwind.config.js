/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      colors: {
        high: '#C84B2F',
        'high-bg': '#FDF0EC',
        'high-border': '#F5C4B3',
        med: '#B07A1A',
        'med-bg': '#FDF6E6',
        'med-border': '#FAC775',
        low: '#2E7D52',
        'low-bg': '#EBF5F0',
        'low-border': '#9FE1CB',
        accent: '#2D5BE3',
        'accent-bg': '#EEF2FD',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.25s ease',
        'pulse-dot': 'pulseDot 1.2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        pulseDot: { '0%,80%,100%': { opacity: 0.2, transform: 'scale(0.8)' }, '40%': { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}
