import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { Buffer } from 'buffer'

// ELECTRON=true  → base './'  (rutas relativas, necesario para cargar desde archivo)
// Sin ELECTRON   → base '/'   (rutas absolutas, correcto para Vercel / web)
const isElectron = process.env.ELECTRON === 'true'

// Plugin que inyecta el timestamp de build en sw.js para forzar detección de nueva versión
function injectSwVersion() {
  return {
    name: 'inject-sw-version',
    closeBundle() {
      const swPath = path.resolve('dist/sw.js')
      if (!fs.existsSync(swPath)) return
      let content = fs.readFileSync(swPath, 'utf-8')
      content = content.replace('esfuerzo-v2', `esfuerzo-${Date.now()}`)
      fs.writeFileSync(swPath, content)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const GAS_URL = env.VITE_APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || ''

  const devApiGasPlugin = {
    name: 'dev-api-gas-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/gas')) return next()

        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
        if (req.method === 'OPTIONS') return res.end(null)

        if (!GAS_URL) {
          res.statusCode = 500
          return res.end(JSON.stringify({ ok: false, error: 'VITE_APPS_SCRIPT_URL no configurada' }))
        }

        try {
          const chunks = []
          for await (const chunk of req) chunks.push(Buffer.from(chunk))
          const rawBody = Buffer.concat(chunks).toString() || undefined

          let targetUrl = GAS_URL
          if (req.method === 'GET' && req.url.includes('?')) {
            const qs = req.url.split('?')[1]
            targetUrl = GAS_URL + (GAS_URL.includes('?') ? '&' + qs : '?' + qs)
          }

          const fetchOpts = {
            method: req.method,
            headers: { 'Content-Type': 'application/json' },
          }
          if (rawBody && req.method !== 'GET') fetchOpts.body = rawBody

          const r = await fetch(targetUrl, fetchOpts)
          const text = await r.text()
          res.statusCode = r.status
          const ct = r.headers.get('content-type')
          if (ct) res.setHeader('Content-Type', ct)
          return res.end(text)
        } catch (err) {
          res.statusCode = 500
          return res.end(JSON.stringify({ ok: false, error: err.message }))
        }
      })
    },
  }

  return {
    base: isElectron ? './' : '/',
    server: {
      port: 5173,
      proxy: {},
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
            icons: ['lucide-react'],
          },
        },
      },
    },
    plugins: [devApiGasPlugin, react(), injectSwVersion()],
  }
})
