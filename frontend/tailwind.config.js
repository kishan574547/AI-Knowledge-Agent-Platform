/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: 'var(--bg-base)',
        surface: 'var(--bg-surface)',
        'surface-2': 'var(--bg-surface-2)',
        border: 'var(--border)',
        'text-main': 'var(--text-primary)',
        'text-muted': 'var(--text-secondary)',
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          tint: 'var(--accent-tint)',
        },
        success: {
          DEFAULT: 'var(--success)',
          tint: 'var(--success-tint)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          tint: 'var(--warning-tint)',
        },
        danger: {
          DEFAULT: 'var(--danger)',
          tint: 'var(--danger-tint)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '"Inter Tight"', '"IBM Plex Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        level1: 'var(--shadow-level1)',
        level2: 'var(--shadow-level2)',
      },
      transitionDuration: {
        '250': '250ms',
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'pulse-subtle': 'pulseSubtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
    },
  },
  plugins: [],
}
