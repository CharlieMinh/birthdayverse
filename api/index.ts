import { createApi } from '../server/api.js'
import { BlobStorage } from '../server/blobStorage.js'

// Every /api/* path is rewritten here (see vercel.json); server/api.ts routes it.
const handle = createApi(new BlobStorage(), {
  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
  secureCookies: true,
})

export default {
  fetch(request: Request) {
    return handle(request)
  },
}
