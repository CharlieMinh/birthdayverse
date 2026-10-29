import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomToken } from '../src/profile/slug.js'
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES, assetPrefix, type Storage, type StoredItem } from './storage.js'

export const LOCAL_URL_PREFIX = '/__data/'

/** Development-only storage in a folder (default `.data/`), served at /__data/. */
export class LocalStorage implements Storage {
  readonly mode = 'local' as const

  constructor(readonly root: string) {}

  /** Resolves a stored pathname to a file, refusing anything outside the root. */
  resolve(pathname: string): string {
    const file = path.resolve(this.root, pathname)
    if (!file.startsWith(path.resolve(this.root) + path.sep)) throw new Error('Path outside storage root')
    return file
  }

  async readJson(pathname: string): Promise<unknown | null> {
    try {
      return JSON.parse(await readFile(this.resolve(pathname), 'utf8'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw error
    }
  }

  async writeJson(pathname: string, data: unknown): Promise<void> {
    const file = this.resolve(pathname)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, JSON.stringify(data, null, 2))
  }

  async list(prefix: string): Promise<StoredItem[]> {
    const dir = this.resolve(prefix.replace(/\/$/, '') || '.')
    let entries: string[]
    try {
      entries = (await readdir(dir, { recursive: true, withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => path.relative(this.root, path.join(e.parentPath, e.name)).split(path.sep).join('/'))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
    return entries.map((pathname) => ({ pathname, url: LOCAL_URL_PREFIX + pathname }))
  }

  async delete(pathnames: string[]): Promise<void> {
    await Promise.all(pathnames.map((p) => rm(this.resolve(p), { force: true })))
  }

  /** Raw-body upload: POST /api/upload?slug=…&name=… with the file as the body. */
  async handleUpload(request: Request, slug: string): Promise<Response> {
    const type = (request.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!UPLOAD_TYPES.includes(type)) return Response.json({ error: `Unsupported type ${type}` }, { status: 415 })
    const bytes = new Uint8Array(await request.arrayBuffer())
    if (bytes.byteLength > MAX_UPLOAD_BYTES) return Response.json({ error: 'File too large' }, { status: 413 })
    const rawName = new URL(request.url).searchParams.get('name') ?? 'file'
    const name = rawName.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+/, '').slice(-60) || 'file'
    const pathname = `${assetPrefix(slug)}${randomToken(10)}-${name}`
    const file = this.resolve(pathname)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, bytes)
    return Response.json({ url: LOCAL_URL_PREFIX + pathname, pathname })
  }
}
