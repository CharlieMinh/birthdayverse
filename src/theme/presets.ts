import type { Theme } from '../config/types'

const fonts = (families: string[]) =>
  `https://fonts.googleapis.com/css2?${families.map((f) => `family=${f}`).join('&')}&display=swap`

/**
 * Ready-made looks. All are dark and cinematic so the scenes keep their
 * contrast; they differ in palette, type, ambient particles and backdrop.
 * Every font listed here ships Vietnamese glyphs.
 */
export const THEME_PRESETS = {
  starry: {
    id: 'starry',
    colors: {
      bg: '#07060d', surface: '#16112a', text: '#f7efe4', muted: '#b9afc9',
      accent: '#f3c677', rose: '#ff8fa3', glow: '#ffdca8', env1: '#54428a', env2: '#1d1633',
    },
    fonts: {
      display: '"Cormorant Garamond", "Times New Roman", serif',
      body: '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
    },
    fontsHref: fonts(['Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400', 'Manrope:wght@400;500;600']),
    celebration: ['#f3c677', '#ff8fa3', '#ffffff', '#9fd8ff', '#c9a7ff', '#ffd27a'],
    ambient: 'stars',
    backdrop: 'radial-gradient(ellipse at 50% 120%, #1a1233 0%, #07060d 60%)',
  },
  pastel: {
    id: 'pastel',
    colors: {
      bg: '#1d1424', surface: '#2b1d36', text: '#fff4f8', muted: '#d9c3d6',
      accent: '#ffb3c7', rose: '#c8a2ff', glow: '#ffd6e4', env1: '#f2a7c0', env2: '#8e5f8f',
    },
    fonts: {
      display: '"Lora", Georgia, serif',
      body: '"Quicksand", system-ui, sans-serif',
    },
    fontsHref: fonts(['Lora:ital,wght@0,400;0,600;1,400', 'Quicksand:wght@400;500;600']),
    celebration: ['#ffb3c7', '#c8a2ff', '#a7e3ff', '#fff1a8', '#ffffff', '#ffc9a8'],
    ambient: 'petals',
    backdrop: 'radial-gradient(ellipse at 20% 0%, #3a2440 0%, transparent 55%), radial-gradient(ellipse at 80% 100%, #2b2148 0%, #1d1424 60%)',
  },
  gold: {
    id: 'gold',
    colors: {
      bg: '#0a0806', surface: '#1a140c', text: '#fbf3e3', muted: '#c9b99a',
      accent: '#e2b765', rose: '#f0d6a0', glow: '#ffe2a8', env1: '#3a2c18', env2: '#14100a',
    },
    fonts: {
      display: '"Playfair Display", Georgia, serif',
      body: '"Montserrat", system-ui, sans-serif',
    },
    fontsHref: fonts(['Playfair+Display:ital,wght@0,400;0,600;1,400', 'Montserrat:wght@400;500;600']),
    celebration: ['#e2b765', '#fff3d6', '#c9993f', '#ffffff', '#f0d6a0'],
    ambient: 'bokeh',
    backdrop: 'radial-gradient(ellipse at 50% 40%, #1f170c 0%, #0a0806 65%)',
  },
  neon: {
    id: 'neon',
    colors: {
      bg: '#07031a', surface: '#140a33', text: '#f4f1ff', muted: '#b4a9e0',
      accent: '#3ff0ff', rose: '#ff4fd8', glow: '#9a7bff', env1: '#3b1d8f', env2: '#120638',
    },
    fonts: {
      display: '"Baloo 2", system-ui, sans-serif',
      body: '"Be Vietnam Pro", system-ui, sans-serif',
    },
    fontsHref: fonts(['Baloo+2:wght@500;700', 'Be+Vietnam+Pro:wght@400;500;600']),
    celebration: ['#3ff0ff', '#ff4fd8', '#fff35c', '#7dff8a', '#9a7bff', '#ffffff'],
    ambient: 'bokeh',
    backdrop: 'radial-gradient(ellipse at 10% 10%, #2a0b5e 0%, transparent 50%), radial-gradient(ellipse at 90% 90%, #3d0a4f 0%, #07031a 60%)',
  },
  sakura: {
    id: 'sakura',
    colors: {
      bg: '#110c1a', surface: '#1f1830', text: '#fdf2f5', muted: '#cdb9cc',
      accent: '#ff9ec0', rose: '#ffd1dc', glow: '#ffc4d6', env1: '#6b3f6e', env2: '#241730',
    },
    fonts: {
      display: '"Dancing Script", cursive',
      body: '"Nunito", system-ui, sans-serif',
    },
    fontsHref: fonts(['Dancing+Script:wght@500;700', 'Nunito:wght@400;600']),
    celebration: ['#ff9ec0', '#ffd1dc', '#ffffff', '#ffb7a8', '#e8a6ff'],
    ambient: 'petals',
    backdrop: 'radial-gradient(ellipse at 50% 0%, #2d1a35 0%, #110c1a 65%)',
  },
} satisfies Record<string, Theme>

export type ThemeId = keyof typeof THEME_PRESETS

export const THEME_IDS = Object.keys(THEME_PRESETS) as ThemeId[]

/** Names shown in the Studio. */
export const THEME_LABELS: Record<ThemeId, { vi: string; en: string }> = {
  starry: { vi: 'Đêm sao', en: 'Starry night' },
  pastel: { vi: 'Pastel ngọt ngào', en: 'Sweet pastel' },
  gold: { vi: 'Vàng sang trọng', en: 'Golden luxe' },
  neon: { vi: 'Neon tiệc tùng', en: 'Neon party' },
  sakura: { vi: 'Hoa anh đào', en: 'Cherry blossom' },
}

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && value in THEME_PRESETS
}
