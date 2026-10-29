/** Builds the secret link id: a readable name part plus random characters, e.g. "minh-7k3p9x2q". */
export function makeSlug(name: string, randomPart: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
    .replace(/-+$/, '')
  return base ? `${base}-${randomPart}` : `b-${randomPart}`
}

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'

/** Random characters from a look-alike-free alphabet using the platform CSPRNG. */
export function randomToken(length = 8): string {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}
