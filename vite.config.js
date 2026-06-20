/* global process */
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { getMetroData } from './netlify/functions/_metroCore.mjs'
import { getAccessibleInfra } from './netlify/functions/_osmCore.mjs'
import { getRoute } from './netlify/functions/_routeCore.mjs'
import { getBoundary } from './netlify/functions/_boundaryCore.mjs'

// Yerel geliştirme için /api/* : prod'daki Netlify Function'larla aynı çekirdeği
// çalıştırır, böylece dev'de de gerçek veri (CORS'suz) gelir.
function devApi(path, fn) {
  return {
    name: `dev-api${path.replace(/\//g, '-')}`,
    configureServer(server) {
      server.middlewares.use(path, async (_req, res) => {
        try {
          const data = await fn()
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e?.message || e) }))
        }
      })
    },
  }
}

// POST gövdeli /api/route (başlangıç/hedef/kaçınılacak engeller)
function routeDevApi() {
  return {
    name: 'dev-api-route',
    configureServer(server) {
      server.middlewares.use('/api/route', async (req, res) => {
        try {
          let body = ''
          for await (const chunk of req) body += chunk
          const data = await getRoute(body ? JSON.parse(body) : {})
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(data))
        } catch (e) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: String(e?.message || e) }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env içindeki ORS_API_KEY'i sunucu tarafı (dev middleware) için yükle
  const env = loadEnv(mode, process.cwd(), '')
  if (env.ORS_API_KEY) process.env.ORS_API_KEY = env.ORS_API_KEY
  return {
    plugins: [
      react(),
      devApi('/api/metro', getMetroData),
      devApi('/api/osm', getAccessibleInfra),
      devApi('/api/boundary', getBoundary),
      routeDevApi(),
    ],
    base: './',
  }
})
