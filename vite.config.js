import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getMetroData } from './netlify/functions/_metroCore.mjs'
import { getAccessibleInfra } from './netlify/functions/_osmCore.mjs'

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi('/api/metro', getMetroData), devApi('/api/osm', getAccessibleInfra)],
  base: './',
})
