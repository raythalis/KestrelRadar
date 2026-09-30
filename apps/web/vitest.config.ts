import { fileURLToPath } from 'node:url'

import vue from '@vitejs/plugin-vue'
import vuetify, { transformAssetUrls } from 'vite-plugin-vuetify'
import { configDefaults, defineConfig } from 'vitest/config'

// 独立配置：不 merge vite.config（后者是按 mode 求值的函数，mergeConfig 不支持回调形式）
export default defineConfig({
  plugins: [vue({ template: { transformAssetUrls } }), vuetify({ autoImport: true })],
  define: {
    __APP_VERSION__: JSON.stringify('test'),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/__tests__/setup.ts'],
    // vuetify 的组件会 side-import 自己的 css，交给 vite 处理而不是 node
    server: { deps: { inline: ['vuetify'] } },
    exclude: [...configDefaults.exclude, 'e2e/**'],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
})
