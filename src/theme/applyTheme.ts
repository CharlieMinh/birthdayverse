import type { Theme } from '../config/types'
import { hexToRgbTriplet } from '../lib/color'

/**
 * Writes theme tokens as CSS variables consumed by Tailwind and index.css,
 * sets the page backdrop and loads the theme's Google Fonts.
 */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  for (const [name, hex] of Object.entries(theme.colors)) {
    root.style.setProperty(`--c-${name}`, hexToRgbTriplet(hex))
  }
  root.style.setProperty('--font-display', theme.fonts.display)
  root.style.setProperty('--font-body', theme.fonts.body)
  root.style.setProperty('--backdrop', theme.backdrop)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.colors.bg)

  let link = document.querySelector<HTMLLinkElement>('link[data-theme-fonts]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'stylesheet'
    link.dataset.themeFonts = ''
    document.head.appendChild(link)
  }
  if (link.href !== theme.fontsHref) link.href = theme.fontsHref
}
