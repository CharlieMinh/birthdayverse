import { describe, expect, it } from 'vitest'
import { crc32, createZip, safeFileName } from './zip'

/** Reads a stored ZIP back through its central directory, like an unzip tool would. */
function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const end = bytes.length - 22
  expect(view.getUint32(end, true)).toBe(0x06054b50)
  const count = view.getUint16(end + 10, true)
  let pos = view.getUint32(end + 16, true)
  const out = new Map<string, Uint8Array>()
  for (let i = 0; i < count; i++) {
    expect(view.getUint32(pos, true)).toBe(0x02014b50)
    const crc = view.getUint32(pos + 16, true)
    const size = view.getUint32(pos + 20, true)
    const nameLen = view.getUint16(pos + 28, true)
    const localOffset = view.getUint32(pos + 42, true)
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen))
    expect(view.getUint32(localOffset, true)).toBe(0x04034b50)
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true)
    const data = bytes.subarray(dataStart, dataStart + size)
    expect(crc32(data)).toBe(crc)
    out.set(name, data)
    pos += 46 + nameLen
  }
  return out
}

describe('createZip', () => {
  it('round-trips files, including Vietnamese names', () => {
    const files = [
      { name: 'loi-chuc.txt', data: new TextEncoder().encode('Chúc mừng sinh nhật Hân!') },
      { name: 'ảnh/01 Kỷ niệm.webp', data: new Uint8Array([1, 2, 3, 4, 5]) },
      { name: 'empty.bin', data: new Uint8Array() },
    ]
    const zip = readZip(createZip(files, new Date(2026, 9, 31, 12, 0, 0)))
    expect([...zip.keys()]).toEqual(files.map((f) => f.name))
    expect(new TextDecoder().decode(zip.get('loi-chuc.txt'))).toBe('Chúc mừng sinh nhật Hân!')
    expect([...zip.get('ảnh/01 Kỷ niệm.webp')!]).toEqual([1, 2, 3, 4, 5])
  })

  it('computes the standard CRC-32', () => {
    expect(crc32(new TextEncoder().encode('123456789'))).toBe(0xcbf43926)
  })
})

describe('safeFileName', () => {
  it('keeps Vietnamese text and strips path characters', () => {
    expect(safeFileName('Chuyến đi Đà Lạt / 2024?', 'x')).toBe('Chuyến đi Đà Lạt 2024')
    expect(safeFileName('  ', 'anh')).toBe('anh')
    expect(safeFileName('../../etc', 'x')).toBe('.. .. etc')
  })
})
