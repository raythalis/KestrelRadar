import { fileURLToPath } from 'node:url'

import { configDefaults, defineConfig } from 'vitest/config'

// 独立配置：不 merge vite.config（后者是按 mode 求值的函数，mergeConfig 不支持回调形式）
export default defineConfig({
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
    exclude: [...configDefaults.exclude, 'e2e/**'],
    root: fileURLToPath(new URL('./', import.meta.url)),
  },
})
