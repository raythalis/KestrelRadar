# HTTP API

Kestrel Radar 的后端同时提供界面与 API；所有业务接口统一以 `/api` 开头，`GET /api/health` 返回 `{ "status": "ok", "apiPrefix": "/api" }`。以下是当前注册的路由，不是计划中的接口。v1.0 没有账号或 API 鉴权；**不要把服务直接暴露到不可信网络**。具体输入和输出字段以 `packages/contracts/src/` 的 Zod 契约、`apps/api/src/modules/*/*.routes.ts` 与服务实现为准。本篇是调用入口，不提供自动生成的 OpenAPI 规范。

## 请求与结果

创建资源通常返回 HTTP 201，删除返回 204（无响应正文）；读取和更新通常直接返回实体或列表。需要 JSON 请求体时发送 `Content-Type: application/json`。GET 参数按各接口说明传递。不要假定所有成功响应都包在同一个 `data` 字段里。

请求本身失败时是非 2xx，错误正文形如 `{"success":false,"error":{"code":"VALIDATION_ERROR","message":"…","details":{"field":"name","rule":"REQUIRED_FIELD"}}}`；`details` 只在有定位信息时出现。当前错误码契约为 `VALIDATION_ERROR`、`NOT_FOUND`、`CONFLICT`、`FORBIDDEN`、`UNAUTHORIZED`、`INTERNAL_ERROR`，其中后两个保留为契约值，不表示 v1.0 已实现鉴权。实际状态码以服务端返回为准；常见是 400/404/409/500。

读取 Telegram 会话、测试渠道发送可能是 **HTTP 200 + `success:true` + `data.ok:false`**；发现手动测试则直接返回顶层 `ok:false`（没有 `success` 信封）。两者都表示 HTTP 请求成功但业务操作失败：按对应层级查看 `code`、`message`，必要时看 `details.reason`；`ok:true` 才代表业务成功。比如测试渠道可返回 `{"success":true,"data":{"ok":false,"code":"TIMEOUT","message":"…"}}`。业务码包括 `AUTH_FAILED`、`TIMEOUT`、`NETWORK_ERROR`、`RATE_LIMITED`、`INVALID_RESPONSE`、`UNAVAILABLE`；不要把它们和 HTTP 错误码混用。操作结果契约见 `packages/contracts/src/operation-result.ts`。密钥只写入，不从读取接口明文回显。

## 配置与基础资源

| 方法与路径 | 用途 / 输入 | 返回 |
| --- | --- | --- |
| `GET /api/config` | 一次读取分组、发现、监听、动作、渠道、供应商、模板及设置的快照 | `ConfigSnapshot`，不含密钥明文 |
| `GET /api/settings` | 读取合并默认值后的设置 | `Settings` |
| `PATCH /api/settings` | 传设置字段的 JSON 子集，不能是空对象 | 更新后的 `Settings` |
| `DELETE /api/settings/:key` | 删除某项覆盖值，恢复该项代码默认值 | 更新后的 `Settings`；**会修改设置** |
| `GET /api/config/rsshub-status` | 可选查询 `force=1` 跳过短期缓存，`baseUrl` 探测指定实例 | RSSHub 状态；只探测，不保存设置 |
| `GET /api/groups`、`GET /api/groups/:id` | 列表、详情 | 分组列表或分组 |
| `POST /api/groups` | JSON：`name`，可选 `description`、`enabled` | 新分组，201 |
| `PATCH /api/groups/:id`、`DELETE /api/groups/:id` | 部分更新、删除 | 更新后的分组 / 204 |
| `GET /api/discoveries`、`GET /api/discoveries/:id` | 发现列表、详情 | 发现列表或发现 |
| `POST /api/discoveries` | JSON：`groupId`、`name`、`kind`、`target`、`cronExpression`，可选 `enabled` | 新发现，201；还可能抓取图标 |
| `PATCH /api/discoveries/:id`、`DELETE /api/discoveries/:id` | 部分更新、删除 | 更新后的发现 / 204 |
| `POST /api/discoveries/:id/test` | 手动探测已保存发现；不新增条目，但更新其卡片探测状态 | `DiscoveryTestResult`（顶层 `ok`、`message`、可选 `code`/`details`/`data`） |
| `POST /api/discoveries/:id/icon` | 重新抓取图标；会写入图标/来源状态 | 更新后的发现 |
| `GET /api/icons/:file` | 读取本地缓存图标；仅在图标目录启用时注册 | 图片内容 |

资源类型与字段（包括枚举、长度、默认值）见 `packages/contracts/src/entities.ts` 和 `settings.ts`。发现的 `kind` 是 `rss`、`rsshub` 或 `web`；详情含卡片上的采集状态。`/api/config` 是读取快照，不能用来写入全部资源。

## 监听、动作、渠道与模板

| 方法与路径 | 用途 / 输入 | 返回 |
| --- | --- | --- |
| `GET /api/monitors`、`GET /api/monitors/:id` | 监听列表、详情 | 监听列表或监听 |
| `POST /api/monitors` | JSON：`groupId`、`name`；模式、灵敏度、关键词、排除词、动作关联等可选 | 新监听，201 |
| `PATCH /api/monitors/:id`、`DELETE /api/monitors/:id` | 部分更新、删除 | 更新后的监听 / 204 |
| `POST /api/monitors/:id/preview` | JSON 可传 `sampleSize`（1–50）和临时 `rules`；从同组已有内容做**只读算法预览，不调模型、不写判定** | `{total,matched,dropped,needsModel,samples}`；后端接口存在，当前界面没有入口 |
| `GET /api/actions`、`GET /api/actions/:id` | 动作列表、详情 | 动作列表或动作 |
| `POST /api/actions` | JSON：`groupId`、`name`、`channelId`；触发方式、模板等可选 | 新动作，201 |
| `PATCH /api/actions/:id`、`DELETE /api/actions/:id` | 部分更新、删除 | 更新后的动作 / 204 |
| `GET /api/channels`、`GET /api/channels/:id` | 渠道列表、详情 | 渠道列表或渠道；密钥不明文返回 |
| `POST /api/channels` | JSON：`name`、`type`、`config`、可选 `secret` 与 `enabled` | 新渠道，201 |
| `PATCH /api/channels/:id`、`DELETE /api/channels/:id` | 部分更新、删除 | 更新后的渠道 / 204；仍被动作引用时删除会冲突 |
| `POST /api/channels/:id/test` | **真实发送一条测试消息**，不要在只读脚本中调用 | `{success:true,data:ChannelTestResult}` |
| `POST /api/channels/telegram/chats` | JSON：`token` 或 `channelId`（至少一个）；用 Bot API 读取已见会话 | `{success:true,data:TelegramChatsResult}` |
| `GET /api/templates` | 列出内置和自定义模板 | 模板列表 |
| `POST /api/templates` | JSON：名称、正文等，按模板契约校验 | 新模板，201 |
| `PATCH /api/templates/:id`、`DELETE /api/templates/:id` | 修改、删除自定义模板；内置模板不能改删 | 更新后的模板 / 204 |

判定参数与意义见[打分规则](judgment-scoring.md)和[LLM+](llm-plus.md)。完整模板字段见 `packages/contracts/src/template.ts`；不要把 `preview` 当作一次真实判定或模型调用。

## 模型、事件、异常与统计

| 方法与路径 | 用途 / 输入 | 返回 |
| --- | --- | --- |
| `GET /api/model-providers`、`GET /api/model-providers/:id` | 供应商列表、详情 | 供应商数据，不含 API Key 明文 |
| `POST /api/model-providers` | JSON：`name`、`kind`、`baseUrl` 等，可选 API Key | 新供应商，201 |
| `PATCH /api/model-providers/:id`、`DELETE /api/model-providers/:id` | 修改、删除 | 更新后的供应商 / 204 |
| `GET /api/model-providers/:id/available-models` | 现场向供应商请求模型清单；失败返回空数组 | `{models:[...]}`；可能访问第三方网络 |
| `GET /api/events` | `cursor`、`limit`、`discoveryId` 可选；只查最近 24 小时 | `{events,nextCursor,total}`；默认每页 20，最大 50；游标原样续传 |
| `GET /api/events/sources` | 最近窗口内可选的来源及各自事件数 | `{discoveryId,name,count}` 的列表 |
| `POST /api/events/:id/read` | 标记事件已读，**会写状态** | `{id,readAt}` |
| `GET /api/incidents` | 查看未忽视的近期异常 | 异常列表 |
| `POST /api/incidents/:id/dismiss` | 忽视异常，**不会修复原因** | 更新后的异常 |
| `GET /api/stats/overview` | 仪表盘汇总 | 统计对象 |
| `GET /api/stats/cards` | 配置页卡片背面的汇总 | 各类卡片统计 |

`GET /api/events` 的 `limit` 非正整数报 400、超上限截断；`cursor` 是不透明字符串，不要自己拼接。示例仅作接口形状说明，不使用真实 ID 或凭据。以上没有“立即正式采集并投递”的用户 API；调度器会按发现计划执行。详细字段以 `packages/contracts/src/` 和服务端实际返回为准。
