# Kestrel

![Kestrel Radar](assets/branding/kestrel-radar-readme-banner.webp)

个人信息监听与事件响应（Personal watching & event response）。

一个自托管的 Web 应用：你告诉它**看哪里**（来源）、**在意什么**（监听）、**发现后怎么办**（动作），
它负责持续采集、判断，并把值得知道的事推给你。

```text
Source → Watcher → Event → Action
```

## 仓库结构

```
kestrel/
├─ apps/
│  ├─ web/         前端：Vue 3 + Vuetify 4 + TypeScript + Vite
│  └─ api/         后端：TypeScript（Fastify）—— 尚未实现，见 apps/api/README.md
├─ packages/
│  └─ contracts/   前后端共享契约（随后端阶段落地）
├─ docs/           规格、领域模型与接口契约
└─ infra/docker/   后期容器化打包
```

## 分支约定

- `master`：**只放可用成品**。合并前必须通过类型检查、单元测试与生产构建。
- `develop`：日常开发分支；功能做完、自检通过后再合并进 `master`。
- 功能/修复分支：`feat/*`、`fix/*`，从 `develop` 切出，合并回 `develop`。
- 本地专用内容（本机环境说明、迁移参考代码、脚本）不进版本库。

## 代码风格

由根目录 `.prettierrc.json` 统一约定，全仓库一份配置：

- **字符串一律用单引号**（`singleQuote: true`；Vue/HTML 模板属性由 Prettier 固定为双引号）
- **不写分号**（`semi: false`）
- **每行最多 100 列**（`printWidth: 100`）

```bash
cd apps/web
pnpm format           # 按上述规范格式化（等价于根目录 pnpm format）
pnpm format:check     # 只检查不修改（CI 用）
```

## 开发

包管理器 **pnpm**（工作区统一安装）。版本已在 `package.json` 的 `packageManager` 固定，
用 corepack 会自动切换到该版本：

```bash
pnpm install         # 在仓库根目录执行一次，安装全部子项目依赖
pnpm dev             # 开发服务器（HMR）
pnpm type-check      # 类型检查
pnpm test:unit       # 单元测试
pnpm build           # 类型检查 + 生产构建
pnpm lint            # oxlint + ESLint
pnpm format          # Prettier 格式化
```

单独操作某个子项目：`pnpm --filter kestrel-web <script>`。

## 当前状态

- 前端：可运行的界面骨架（总览 / 关注分组 / 设置），深浅色主题 + 中英文切换；
  当前展示的是**内置示例数据**，界面上明确标注。
- 后端：**尚未实现**，`/api/v2` 契约见 `docs/grouped-ui-api-contract.md`。
- 采集、判断、推送：**都还没有**。示例数据不代表任何真实能力。

## 文档

- `docs/product-scope.md` — 产品范围与边界
- `docs/scenarios.md` — 验收场景
- `docs/domain-model.md` — 领域模型与不变量
- `docs/ui-behavior.md` — 界面与提示行为
- `docs/grouped-ui-api-contract.md` — 分组 UI 与 HTTP 接口契约（草案）
- `docs/processing-and-llm.md` — 纯代码 / LLM / 本地模型的边界
- `docs/retention-and-failure.md` — 保留策略与失败处理
- `docs/agent-integration.md` — 与外部 agent 的集成
- `docs/implementation-plan.md` — 实施计划

## 许可

MIT
