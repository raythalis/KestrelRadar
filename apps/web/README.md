# apps/web

Kestrel 前端：**Vue 3 + Vuetify 3 + TypeScript + Vite**。页面在 `src/views`，业务组件在 `src/components`
（新件统一 `App*` 前缀包 Vuetify），样式在 `src/styles`（`v2.scss` 是当前一代，`main.scss` 是旧一代、尚未迁完）。

开发由宿主 systemd 单元 `kestrel-web` 托管（Vite，5173）；类型检查 `pnpm --filter kestrel-web type-check`，
单测 vitest（`src/__tests__`）。设计规则见 `docs/design/`。
