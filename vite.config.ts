import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const crossOriginHeaders = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
}

// https://vite.dev/config/
export default defineConfig({
  base: '/chess-insights/',
  plugins: [
    vue(),
    {
      name: 'cross-origin-isolation-headers',
      configureServer(server) {
        server.middlewares.use((_, res, next) => {
          for (const [key, value] of Object.entries(crossOriginHeaders)) {
            res.setHeader(key, value)
          }
          next()
        })
      },
    },
    {
      name: 'inject-coi-serviceworker',
      transformIndexHtml(html) {
        return html.replace(
          '</body>',
          '<script src="./coi-serviceworker.js"></script>\n  </body>',
        )
      },
    },
  ],
  server: {
    headers: crossOriginHeaders,
  },
  preview: {
    headers: crossOriginHeaders,
  },
})
