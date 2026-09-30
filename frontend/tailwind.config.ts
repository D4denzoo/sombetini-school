import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
          800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))',
          950: 'hsl(var(--brand-950))',
        },
        gold: {
          DEFAULT: 'hsl(var(--gold-500))',
          50: 'hsl(var(--gold-50))',
          100: 'hsl(var(--gold-100))',
          200: 'hsl(var(--gold-200))',
          300: 'hsl(var(--gold-300))',
          400: 'hsl(var(--gold-400))',
          500: 'hsl(var(--gold-500))',
          600: 'hsl(var(--gold-600))',
          700: 'hsl(var(--gold-700))',
        },
        lime: {
          300: 'hsl(var(--lime-300))',
          400: 'hsl(var(--lime-400))',
        },
        paper: 'hsl(var(--background))',
        sand: 'hsl(42 40% 97%)',
        clay: 'hsl(var(--border))',
        forest: {
          DEFAULT: 'hsl(var(--brand-700))',
          deep: 'hsl(var(--brand-950))',
        },
        ink: 'hsl(var(--foreground))',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.25rem',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(16, 24, 40, 0.04), 0 8px 24px -12px rgba(16, 24, 40, 0.12)',
        card: '0 1px 3px rgba(16, 24, 40, 0.06), 0 20px 40px -24px rgba(6, 56, 42, 0.25)',
        lift: '0 24px 60px -24px rgba(6, 56, 42, 0.35)',
        glow: '0 0 0 1px hsl(var(--brand-200)), 0 12px 40px -12px hsl(var(--brand-500) / 0.45)',
        gold: '0 12px 32px -12px hsl(var(--gold-500) / 0.55)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to right, hsl(var(--border) / 0.6) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.6) 1px, transparent 1px)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        'float-slow': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        shimmer: { from: { backgroundPosition: '0 0' }, to: { backgroundPosition: '-200% 0' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        float: 'float 6s ease-in-out infinite',
        'float-slow': 'float-slow 8s ease-in-out infinite',
        marquee: 'marquee 40s linear infinite',
        shimmer: 'shimmer 2s linear infinite',
      },
    },
  },
  plugins: [animate],
};

export default config;
