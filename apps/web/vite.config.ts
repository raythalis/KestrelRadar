import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'

// Dev server: binds 0.0.0.0 so other machines on the network can watch it;
// /api is proxied to the API dev server (VITE_API_PROXY_TARGET).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const apiTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8765'
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

  return {
    plugins: [
      vue({ template: { transformAssetUrls } }),
      vuetify({
        autoImport: true,
      }),
      AutoImport({
        imports: ['vue', 'vue-router', 'pinia', 'vue-i18n'],
        dts: 'src/auto-imports.d.ts',
      }),
      Components({
        dts: 'src/components.d.ts',
      }),
    ],
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5179,
      strictPort: true,
      proxy: {
        '/api': { target: apiTarget, changeOrigin: true },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  }
})
