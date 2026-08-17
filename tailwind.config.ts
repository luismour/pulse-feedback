import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Pilha de fontes de sistema (sem fetch externo) — moderna e com boa
        // variação de peso em Mac, Windows e Linux, sem depender de rede no build.
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI Variable"',
          '"Segoe UI"',
          'Inter',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(15, 23, 42, 0.06), 0 12px 32px -12px rgba(15, 23, 42, 0.10)',
        'card-hover': '0 4px 16px -4px rgba(15, 23, 42, 0.10), 0 20px 48px -12px rgba(15, 23, 42, 0.16)',
        glow: '0 8px 30px -6px rgba(168, 85, 247, 0.35)',
        'glow-orange': '0 8px 30px -6px rgba(251, 146, 60, 0.35)',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(24px, -32px) scale(1.06)' },
          '66%': { transform: 'translate(-18px, 18px) scale(0.96)' },
        },
        'fade-slide-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        blob: 'blob 14s infinite ease-in-out',
        'fade-slide-in': 'fade-slide-in 0.25s ease-out',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #7c3aed 0%, #d946ef 50%, #fb923c 100%)',
        'brand-gradient-soft': 'linear-gradient(135deg, #ede9fe 0%, #fae8ff 50%, #ffedd5 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
