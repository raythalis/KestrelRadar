# Radar V2 调度、失败、保留与容量规格

状态：草案，待 Phase 0 评审冻结

## 1. 调度分离

采集调度、Watcher 判断调度、Action/汇总调度分开配置。采集频率不决定通知频率。

配置项包括：间隔/时间表、并发上限、超时、重试、退避和暂停窗口。

## 2. 重试

Source、Watcher/LLM、Action 分别配置重试策略。失败通知也是可配置 Action。单个 Source 或 Action 失败不得阻断其他对象。

## 3. Source 状态

active、degraded、unavailable、invalid、disabled、retired。路由不存在或持续失败时保留配置、历史数据和 Watcher，暂停未来采集并提示处置；恢复后可重新 active。

## 4. 规则版本

Watcher 每次有效修改生成版本。默认新数据用新版本、历史不回溯；用户可指定时间范围显式重评估。已执行 Action 不撤回。

## 5. TTL

至少独立配置：原始响应、标准化 Item、Event、LLM 判断、Action 记录、运行日志。具体默认值待实现阶段用真实容量和场景确定。

## 6. 容量上限与超限

可设置数据库总上限及分类上限。超限按以下顺序处理：过期运行日志 → 过期原始响应 → 已归并旧 Item → 已归档且无活动引用 Event → 压缩/检查。

保护活动 Watcher 相关数据、未完成 Action、最近失败记录和用户标记保留数据。仍超限时暂停低优先级采集并告警，保留管理和查询能力，不静默丢数据。

## 7. 主动查询

Radar 接受调用方明确的 start/end、scope、limit 等查询参数，不在核心固定“最近”为某个天数。Agent 可根据用户语境决定时间范围后调用。
