# apps/web

Kestrel Radar 前端：**Vue 3 + Vuetify 4 + TypeScript + Vite**。

- 页面在 `src/views`，可复用组件在 `src/components`（新件统一 `App*` 前缀包一层 Vuetify）
- 样式在 `src/styles`：`v2.scss` 是当前一代，`main.scss` 是旧一代（尚未迁完，别名表保留着）
- 文案全部走 `src/locales/`（`zh-CN.ts` / `en.ts`），两边的键必须一一对应
- 设计规则与视觉方向见 `docs/design/`

开发与检查：

```bash
pnpm dev                            # Vite 开发服务器（5173），/api 代理到后端 8765
pnpm --filter kestrel-web type-check
pnpm --filter kestrel-web test:unit
pnpm --filter kestrel-web build     # 生产构建，产物在 apps/web/dist
```

界面里的 `style-lab` 只在开发模式注册，生产构建里不存在。
