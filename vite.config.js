import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getMetroData } from './netlify/functions/_metroCore.mjs'

// Yerel geliştirme için /api/metro: prod'daki Netlify Function ile aynı çekirdeği
// çalıştırır, böylece dev'de de gerçek resmî veri (CORS'suz) gelir.
function metroDevApi() {
  return {
    name: 'metro-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/metro', async (_req, res) => {
        try {
          const data = await getMetroData()
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
  plugins: [react(), metroDevApi()],
  base: './',
})
