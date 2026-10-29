import { describe, expect, it } from 'vitest'
import { hexToRgba, hexToRgbTriplet } from './color'

describe('color helpers', () => {
  it('converts 6- and 3-digit hex', () => {
    expect(hexToRgbTriplet('#f3c677')).toBe('243 198 119')
    expect(hexToRgbTriplet('#fff')).toBe('255 255 255')
    expect(hexToRgba('#000000', 0.5)).toBe('rgba(0, 0, 0, 0.5)')
  })
  it('falls back to white for invalid input instead of breaking the canvas', () => {
    expect(hexToRgba('not-a-color', 1)).toBe('rgba(255, 255, 255, 1)')
  })
})
