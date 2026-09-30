# apps/api（待实现）

后端目标形态：**TypeScript + Fastify + Zod + SQLite**（Drizzle 或 Kysely 作为查询层）。

当前状态：**只有计划，没有代码**。Phase 1 里那份 Python 只读骨架留在 `legacy/phase1-api/`，
只作为「连接器 / 预览接口」的实现参考，不会继续维护。

计划中的分层：

```
apps/api/
├─ src/
│  ├─ routes/          HTTP 路由（参数校验 + 错误码映射，不写业务）
│  ├─ services/        业务用例（分组、监听、动作、事件）
│  ├─ repositories/    数据访问（SQLite）
│  ├─ schemas/         Zod schema（同时导出 OpenAPI）
│  ├─ plugins/         fastify 插件（日志、错误处理、鉴权）
│  └─ config/          配置读取
└─ tests/              Vitest
```

接口契约（`/api/v2`）见 `docs/grouped-ui-api-contract.md`；在实现之前，前端一律把后端当作不可用，
并在界面上如实标注「示例数据」。
