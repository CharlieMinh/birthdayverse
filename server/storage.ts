/**
 * Where profiles and uploaded media live. Production uses Vercel Blob
 * (server/blobStorage.ts); local development uses a folder on disk
 * (server/localStorage.ts) so the Studio works without any cloud setup.
 */
export interface StoredItem {
  pathname: string
  /** Public URL the browser loads it from. */
  url: string
}

export interface Storage {
  readonly mode: 'blob' | 'local'
  /** Parsed JSON at `pathname`, or null if it does not exist. */
  readJson(pathname: string): Promise<unknown | null>
  writeJson(pathname: string, data: unknown): Promise<void>
  list(prefix: string): Promise<StoredItem[]>
  delete(pathnames: string[]): Promise<void>
  /**
   * Handles an upload request from the Studio. Called only after the admin
   * session has been verified. Uploads are confined to `assets/<slug>/`.
   */
  handleUpload(request: Request, slug: string): Promise<Response>
}

export const PROFILE_PREFIX = 'profiles/'
export const ASSET_PREFIX = 'assets/'

export const profilePath = (slug: string) => `${PROFILE_PREFIX}${slug}.json`
export const assetPrefix = (slug: string) => `${ASSET_PREFIX}${slug}/`

export const UPLOAD_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
]

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
