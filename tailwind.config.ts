import type { Config } from 'tailwindcss'

// Colors resolve to CSS variables written by src/theme/applyTheme.ts,
// so the palette is driven entirely by birthday.config.ts.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'),
        surface: token('surface'),
        ink: token('text'),
        muted: token('muted'),
        accent: token('accent'),
        rose: token('rose'),
        glow: token('glow'),
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
    },
  },
  plugins: [],
} satisfies Config
