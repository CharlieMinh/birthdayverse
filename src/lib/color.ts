/** "#f3c677" → "243 198 119" for use inside rgb(var(--x) / alpha). */
export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? [...clean].map((c) => c + c).join('') : clean
  const n = Number.parseInt(full, 16)
  if (full.length !== 6 || Number.isNaN(n)) return '255 255 255'
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

/** "#f3c677", 0.5 → "rgba(243, 198, 119, 0.5)". Accepts 3- or 6-digit hex. */
export function hexToRgba(hex: string, alpha: number): string {
  return `rgba(${hexToRgbTriplet(hex).split(' ').join(', ')}, ${alpha})`
}
