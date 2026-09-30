# Radar V2 分组 UI 与前后端边界（评审草案）

本页是评审中的接口契约，**不是已实现的后端写接口**。现有后端仍只读；前端当前经 `RadarApi` 接口使用 `MockRadarApi`，数据只保存在访问该页的浏览器 `localStorage`，不发送来源、凭据或通知。生产写入必须先落实登录授权、CSRF/同源保护、审计与备份，再切换独立 HTTP Adapter。

## 对象与边界

- Group：`id, name, description, enabled, revision, cards[]`。一个分组内可有多个 Source、Watcher、Action 卡片；监听只引用本组 Source/Action 的 ID。组禁用不删除卡片与历史。
- Source：`id, kind=source, name, enabled, connector, config, cron`。`connector` 为 `rss|rsshub|github|telegram|web`。配置按连接器版本/能力声明渲染；RSSHub 来源保存全局实例 ID + 该实例的 route ID + 参数，不重复保存实例密钥。
- Watcher：`id, kind=watcher, name, enabled, sourceIds[], focus, include[], exclude[], operator=any|all, llmEnabled, llmProfileId?, fallbackEnabled, actionIds[]`。每条新 Item 的标题与摘要先按排除词及包含词筛选；包含词空列表在设计中表示“该来源所有新条目”，UI 应明确提示成本与噪音。LLM 只复判规则已通过的候选。只有 LLM 超时/错误才可按显式降级开关使用规则结果，模型明确否定不降级；判断和版本必须落库。只有形成 Event 后才派发 Action。
- Action：`id, kind=action, name, enabled, trigger=instant|digest, channelId, template, cron?`。Action 引用独立 Channel；digest 必须有 Cron，instant 为事件触发；不重复保存渠道凭据。真正动作需要支持每条执行的幂等、重试、失败原因与审计。
- Channel：`id, name, type, enabled, capabilities{instant,digest}, credentialStatus`。凭据经专用受鉴权接口只写不读，列表只能看到配置状态；不要把 Hermes 的平台凭据直接复用。微信主动推送能力不能凭类型推断，需真实连接测试。
- LlmProfile：`id, name, type, enabled, credentialStatus`。Provider 的地址/模型/秘密/费用限制由服务端安全保存；Watcher 只引用 profile ID。
- RsshubInstance：`id, name, baseUrl, enabled, catalogStatus`。目录由服务端从该实例同步；浏览器分页搜索，不把数千条目录一次性当成“启用来源”。路由元数据需提供参数模板、凭据/渲染能力要求和目录同步状态；目录存在≠抓取可用，必须实际测试内容。Mock 的路由明确标为样例，绝非实时目录。
- Settings：时区、重试、超时、保留天数等。语言和主题可保存在浏览器本地偏好，不随 Group 生效。

## 预计 HTTP API（`/api/v2`，与现有 `/api/v1` 隔离）

| 方法与路径 | 意图 / 响应 |
|---|---|
| `GET /workspace` | 获取当前用户可见 Group/卡片、Channel（不含秘密）、LlmProfile、RsshubInstance 摘要及 Settings；可按资源分页拆分。|
| `POST /groups`、`PATCH /groups/{id}`、`DELETE /groups/{id}` | 创建、修改、归档/删除组；后端保留历史 Item、Event、判断/动作审计。|
| `PUT /groups/{id}/enabled` | 明确设置 `{enabled: boolean}`，返回最新组状态及 revision；不采用模糊 `toggle`。|
| `POST /groups/{id}/cards`、`PATCH /groups/{id}/cards/{cardId}`、`DELETE /groups/{id}/cards/{cardId}` | 创建、修改、归档/删除卡片；删除被引用卡片时返回影响预览或明确冲突，不可静默改写其他监听。|
| `PUT /groups/{id}/cards/{cardId}/enabled` | 设置单卡启用状态；后端检查所需实例/模型/渠道已配置及能力。|
| `GET /groups/{id}/flow` | 返回 `status=ready|disabled|unavailable`、`reasonCodes[]`、`edges[{from,to,active,reason}]`、`activePaths`。`ready` 仅代表配置拓扑连通，运行健康单列；禁用/丢引用/类型不支持/不可用依赖均不能形成完整路径。|
| `GET/POST/PATCH/DELETE /channels` 与 `/llm-profiles` | 管理独立渠道/模型连接。秘密只能经单独写接口上传，不能在 GET 及日志回显。|
| `GET/POST/PATCH/DELETE /rsshub-instances` | 管理全局 RSSHub 实例。实例地址与网络访问须专门授权与 SSRF 保护。|
| `GET /rsshub-instances/{id}/routes?q=&cursor=&limit=` | 返回该实例实际同步的目录：route ID、显示名、参数与能力要求、下页 cursor、同步时间；关闭/目录未就绪时返回明确原因。|
| `POST /rsshub-instances/{id}/sync`、`POST /sources/preview` | 受鉴权且限流；目录同步或只读连接测试，不保存来源，不隐式启用采集。|
| `POST /groups/{id}/watchers/{id}/dry-run` | 用指定 Item 或受限样例试评估，返回规则/LLM/降级/事件判据各步原因；**不发送真实通知**。|
| `POST /schedules/validate`、`GET/PATCH /settings` | 后端解析五段 Cron + 时区、返回解释及下次执行时间；设置修改必须鉴权审计。|

写请求显式传 `revision`（或 `If-Match`），版本冲突返回 `409` 与最新版本，不覆盖他人/旧标签的更改。客户端只依赖 `RadarApi` 异步方法；切换后端时保持同一类型契约，用 HTTP Adapter 代替 Mock。错误至少区分 `unauthorized`、`forbidden`、`validation_error`、`conflict`、`unavailable_dependency`，并带可本地化的字段/原因码。

## 前端 Mock 对照与未实现清单

当前 `MockRadarApi` 可加载、增删改 Group/卡片/渠道/模型/实例、启停、保存设置并按实例过滤路由；其 `evaluateGroup` 只计算**演示配置的拓扑**，不证明采集或发送真的可运行。Mock 中的禁用、删除立即改变本浏览器状态；后端数据库、现有 Radar 与 NAS 运行配置完全不变。

**未实现**：登录/鉴权、真实写接口与迁移、RSSHub 目录同步及真实连接测试、Cron 后端校验和下次执行时间、持续采集、Watcher 规则/LLM 判断、事件持久化、渠道秘密管理、真实 Action、dry-run、跨设备同步。任何以上功能不得因演示页面存在而称为已可用。