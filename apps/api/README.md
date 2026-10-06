# apps/api

Kestrel 后端：**TypeScript + Fastify + SQLite**。按模块分目录（`src/modules/`：采集、判定、投递、事件、监听、渠道、分组、设置、统计、模板、图标、模型供应商……），
契约来自 `packages/contracts`（Zod）。

运行参数走环境变量：`KESTREL_DB_PATH`（默认 `data/kestrel.db`）、`KESTREL_PORT`（默认 8765）。
线上由宿主 systemd 单元 `kestrel-api` 托管（只监听 127.0.0.1:8765）；单测是 vitest，门禁里由根目录 `pnpm test:unit` 统一跑。
