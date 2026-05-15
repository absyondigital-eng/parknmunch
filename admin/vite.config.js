import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve, join, extname } from 'path'
import { existsSync, createReadStream } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Serves ../images/* from the parent ParkNMunch directory during dev
function serveParentImages() {
  const imgDir = resolve(__dirname, '..', 'images')
  const mime = {
    '.jpeg': 'image/jpeg',
    '.jpg':  'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
  }

  return {
    name: 'serve-parent-images',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url.startsWith('/images/')) return next()
        const filename = decodeURIComponent(req.url.slice('/images/'.length).split('?')[0])
        const filepath = join(imgDir, filename)
        if (!existsSync(filepath)) return next()
        res.setHeader('Content-Type', mime[extname(filename).toLowerCase()] || 'application/octet-stream')
        res.setHeader('Cache-Control', 'public, max-age=3600')
        createReadStream(filepath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveParentImages()],
  server: {
    port: 3001,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
