import { randomBytes } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'
import { createApi } from './api.js'
import { LOCAL_URL_PREFIX, LocalStorage } from './localStorage.js'

const TYPES: Record<string, string> = {
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webm': 'audio/webm',
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  return new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers,
    body: hasBody ? Buffer.concat(chunks) : undefined,
  })
}

async function send(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, key) => res.setHeader(key, value))
  res.end(Buffer.from(await response.arrayBuffer()))
}

/**
 * Runs the same API as production inside `vite dev`, backed by a local
 * `.data/` folder, so the Studio can be used end to end without the cloud.
 */
export function localApi(options: { root: string; env: Record<string, string> }): Plugin {
  return {
    name: 'birthdayverse-local-api',
    apply: 'serve',
    configureServer(server) {
      const storage = new LocalStorage(options.root)
      const adminPassword = options.env.ADMIN_PASSWORD || 'birthday'
      if (!options.env.ADMIN_PASSWORD) {
        server.config.logger.info(`\n  Studio (local): http://localhost:5173/studio — dev password "${adminPassword}" (set ADMIN_PASSWORD in .env.local to change)\n`)
      }
      const handle = createApi(storage, {
        adminPassword,
        sessionSecret: options.env.SESSION_SECRET || randomBytes(32).toString('hex'),
        secureCookies: false,
      })

      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? '/'
        try {
          if (url.startsWith('/api/') || url === '/api') {
            await send(res, await handle(await toRequest(req)))
            return
          }
          if (url.startsWith(LOCAL_URL_PREFIX)) {
            const file = storage.resolve(decodeURIComponent(url.slice(LOCAL_URL_PREFIX.length).split('?')[0]))
            const info = await stat(file).catch(() => null)
            if (!info?.isFile()) {
              res.statusCode = 404
              res.end()
              return
            }
            res.setHeader('Content-Type', TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream')
            res.setHeader('Content-Length', info.size)
            createReadStream(file).pipe(res)
            return
          }
          if (url === '/studio' || url.startsWith('/studio/') || url.startsWith('/studio?')) {
            req.url = '/studio.html'
          }
        } catch (error) {
          next(error)
          return
        }
        next()
      })
    },
  }
}
