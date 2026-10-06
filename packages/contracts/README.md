# packages/contracts

前后端共享的契约，用 Zod **一处定义**（`src/`：`settings` / `judgment` / `events` / `incidents` / `stats` /
`failure-copy` / `cron-copy` / `entities` / `enums` / `template` / `api`）。

后端拿它做请求校验，前端直接引用同一套类型，字段改名会在编译期暴露。
改接口的顺序：**先改这里**，再在 `apps/api` 与 `apps/web` 两侧使用；不同步会先在 `type-check` 爆掉。
