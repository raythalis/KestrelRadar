# 设计文档索引

界面「长什么样、为什么这么长」，正式规则都在本目录。**代码是实现的真相**，这里放的是规则与基准。
各篇只做入口，不在这里复述内容；同一事实只有一处写全。

- `foundation.md` —— Design System 的 Foundation 层规范（分层、token 归属、组件前缀）
- `v2-direction.md` —— 当前视觉方向：v2 完整 token 体系（独立预览层）
- `product-pages.md` —— 正式页面的设计规则（Design Lab 不是产品）
- `ux-writing.md` —— 文案规则：UI 自解释
- `fonts.md` —— 字体：选型、自托管文件与用法约束
- `plan-p5-theme-design.md` —— 主题与 logo 方案（P5，未实施）

色值与主题 token 的唯一来源是 `apps/web/src/design/tokens/`（色值在 `color.ts`）；
样式落在 `apps/web/src/styles/v2.scss`（新一代）与 `main.scss`（旧一代，尚未迁完）。
