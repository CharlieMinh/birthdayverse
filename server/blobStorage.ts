import { del, get, list, put } from '@vercel/blob'
import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { MAX_UPLOAD_BYTES, UPLOAD_TYPES, assetPrefix, type Storage, type StoredItem } from './storage.js'

/**
 * Vercel Blob (public store). Media get random URL suffixes, so links can't be
 * guessed; profile JSON lives at a fixed path and is overwritten on save.
 */
export class BlobStorage implements Storage {
  readonly mode = 'blob' as const

  async readJson(pathname: string): Promise<unknown | null> {
    const result = await get(pathname, { access: 'public', useCache: false })
    if (!result || result.statusCode !== 200 || !result.stream) return null
    return JSON.parse(await new Response(result.stream).text())
  }

  async writeJson(pathname: string, data: unknown): Promise<void> {
    await put(pathname, JSON.stringify(data), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
    })
  }

  async list(prefix: string): Promise<StoredItem[]> {
    const out: StoredItem[] = []
    let cursor: string | undefined
    do {
      const page = await list({ prefix, cursor, limit: 1000 })
      for (const b of page.blobs) out.push({ pathname: b.pathname, url: b.url })
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
    return out
  }

  async delete(pathnames: string[]): Promise<void> {
    for (let i = 0; i < pathnames.length; i += 100) await del(pathnames.slice(i, i + 100))
  }

  async handleUpload(request: Request, slug: string): Promise<Response> {
    const body = (await request.json()) as HandleUploadBody
    try {
      const json = await handleUpload({
        body,
        request,
        onBeforeGenerateToken: async (pathname) => {
          if (!pathname.startsWith(assetPrefix(slug)) || pathname.includes('..')) {
            throw new Error('Upload path is outside this profile')
          }
          return {
            allowedContentTypes: UPLOAD_TYPES,
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            addRandomSuffix: true,
            cacheControlMaxAge: 365 * 24 * 3600,
          }
        },
      })
      return Response.json(json)
    } catch (error) {
      return Response.json({ error: (error as Error).message }, { status: 400 })
    }
  }
}
