# Radar V2 Agent 接入规格

状态：草案，待 Phase 0 评审冻结

## 1. 原则

Radar 独立完成来源采集、事件生成、存储和通知。任何 Agent 都是可选客户端；接口不使用 Hermes 专有格式作为核心契约。

## 2. Agent 主动查询：首选

提供经认证的 REST/JSON API，例如：

```text
GET  /api/v1/sources
GET  /api/v1/watchers
GET  /api/v1/events?start=...&end=...&scope=...&limit=...
GET  /api/v1/events/{id}
POST /api/v1/query
```

查询返回结构化事件、来源证据、命中目标、判断状态、时间和分页信息。时间范围由调用方明确传入；不把“最近”固定为内部常量。未来支持写接口时单独授权、记录审计。

## 3. MCP 适配层：可选

MCP Server 只包装 Radar API，不承载独立业务逻辑。初期只读工具：list_sources、list_watchers、query_events、get_event；写能力在权限、审批和审计完成后单独设计。

## 4. Radar 主动通知 Agent：后置

对于有受信任回调/Webhook 的 Agent，可配置事件推送。消息应含事件 ID、可查询 URL、签名和重试/幂等信息，不盲目发送完整私人内容。对方不支持被动接收时，使用 Agent 主动查询；核心通知不经 Agent。

## 5. Hermes 示例

Hermes 可作为普通 REST/MCP 客户端，也可被 Radar 的已配置回调唤醒。此示例不赋予 Hermes 特权，不构成 Radar 的安装或运行依赖。
