import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const froggyDir = path.resolve(rootDir, '../froggy')

const FROGGY_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.svg': 'image/svg+xml',
}

function serveFroggy(): Plugin {
  const serve = (req: { url?: string; headers: { range?: string } }, res: NodeJS.WritableStream & {
    writeHead: (code: number, headers: Record<string, string | number>) => void
    setHeader: (name: string, value: string | number) => void
    end: () => void
  }, next: () => void) => {
    const raw = req.url?.split('?')[0] ?? ''
    if (raw !== '/froggy' && !raw.startsWith('/froggy/')) return next()
    let rel = decodeURIComponent(raw.slice('/froggy'.length))
    if (rel === '' || rel === '/') rel = '/index.html'
    const file = path.normalize(path.join(froggyDir, rel))
    if (!file.startsWith(froggyDir) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      next()
      return
    }
    const type = FROGGY_TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
    const stat = fs.statSync(file)
    const range = req.headers.range
    if (range) {
      const [startStr, endStr] = range.replace(/bytes=/, '').split('-')
      const start = Number(startStr)
      const end = endStr ? Number(endStr) : stat.size - 1
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
      })
      fs.createReadStream(file, { start, end }).pipe(res)
      return
    }
    res.setHeader('Content-Type', type)
    res.setHeader('Content-Length', stat.size)
    res.setHeader('Accept-Ranges', 'bytes')
    fs.createReadStream(file).pipe(res)
  }

  return {
    name: 'serve-froggy',
    configureServer(server) {
      server.middlewares.use(serve)
    },
    configurePreviewServer(server) {
      server.middlewares.use(serve)
    },
    closeBundle() {
      fs.cpSync(froggyDir, path.resolve(rootDir, 'dist/froggy'), {
        recursive: true,
        filter: (src) => !src.split(path.sep).includes('.git'),
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), serveFroggy()],
  resolve: {
    alias: {
      '@': path.resolve(rootDir, './src'),
    },
  },
  // Bind IPv4 explicitly — on Windows `localhost` often hits 127.0.0.1 while
  // Vite's default listen is [::1] only, which looks like ERR_CONNECTION_REFUSED.
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  // Broader Safari / Telegram WKWebView support (macOS desktop client)
  build: {
    target: 'es2020',
  },
})
