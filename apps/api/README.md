# apps/api

Kestrel Radar 后端：**TypeScript + Fastify + SQLite**。

- 按模块分目录（`src/modules/`：采集、判定、投递、事件、监听、渠道、分组、设置、统计、模板、图标、模型供应商……）
- 契约来自 `packages/contracts`（Zod）
- 数据库是 SQLite（Node 内置的 `node:sqlite`），迁移在 `src/db/migrations.ts` 里按版本顺序执行
- Node 直接运行 TypeScript（类型剥离），**没有构建步骤**：`node src/index.ts`

运行参数走环境变量（全部 `KESTREL_` 前缀）：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `KESTREL_HOST` | `127.0.0.1` | 监听地址 |
| `KESTREL_PORT` | `8765` | 监听端口 |
| `KESTREL_DB_PATH` | `data/kestrel.db` | 数据库位置，图标目录取它的同级 `icons/` |
| `KESTREL_STATIC_DIR` | 存在 `apps/web/dist` 就用它 | 设了就同时托管界面；没构建产物就只提供 API |
| `KESTREL_LOG` | 开启 | 设 `off` 关日志 |

```bash
pnpm --filter kestrel-api dev         # node --watch，改动自动重启
pnpm --filter kestrel-api start       # 生产跑法（可配合已构建的界面）
pnpm --filter kestrel-api test:unit
pnpm --filter kestrel-api type-check
```

接口前缀是 `/api`；`/api/health` 是健康检查。生产形态是同一个进程既发界面又发 API，
没匹配上的页面路径回落到 `index.html`（前端路由刷新不会 404），`/api` 之外的静态文件缺失仍然 404。
