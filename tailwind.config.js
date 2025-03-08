/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        accent1: 'var(--color-accent1)',
        'accent1-hover': 'var(--color-accent1-hover)',
        accent2: 'var(--color-accent2)',
        'accent2-hover': 'var(--color-accent2-hover)',
        accent3: 'var(--color-accent3)',
        'accent3-hover': 'var(--color-accent3-hover)',
        accent4: 'var(--color-accent4)',
        'accent4-hover': 'var(--color-accent4-hover)',
        neutral1: 'var(--color-neutral1)',
        'neutral1-hover': 'var(--color-neutral1-hover)',
        neutral2: 'var(--color-neutral2)',
        'neutral2-hover': 'var(--color-neutral2-hover)',
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)'
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)'
        },
        popover: {
          DEFAULT: 'var(--color-popover)',
          foreground: 'var(--color-popover-foreground)'
        },
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)'
        }
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
        sm: 'var(--radius-sm)',
        xl: 'var(--radius-xl)'
      }
    }
  },
  plugins: [require('tailwindcss-animate'), require('tailwind-scrollbar')]
};
