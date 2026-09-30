# Radar V2 产品范围规格

状态：草案，待 Phase 0 评审冻结

## 1. 产品定义

Radar V2 是一个独立运行的 Docker Web 应用，用于配置来源、监听规则、事件处理和动作执行。

它不是 Hermes 插件，也不是某个 Agent 的专属后端。Hermes、Claude、Gemini 或其他 Agent 都只能作为可选客户端或处理器接入。

## 2. 用户价值

用户无需理解内部采集器、对象绑定、事件归并等实现细节，只需要通过页面配置：

1. 从哪些来源获取信息；
2. 关注哪些内容以及如何判断；
3. 发现后执行哪些动作。

## 3. 首版范围

### 必须支持

- Web 管理页面，主要呈现 Sources / Watchers / Actions 三列。
- Source：RSSHub、GitHub、Telegram、RSS/Atom、网页、HTTP API。
- Source Group：把多个来源分组，供多个 Watcher 复用。
- Watcher：可关联多个目标和多个来源组。
- 纯规则处理、规则后 LLM 辅助处理。
- LLM Provider profile，兼容 OpenAI-compatible 供应商和本地 Ollama。
- LLM 不可用时按 Watcher 配置处理；默认直接报错，可配置降级为纯规则。
- 一个 Watcher 配置多个 Action。
- 事件立即动作、定时汇总动作、用户主动查询三种调用方式。
- 采集调度与通知/汇总调度分离。
- Source、LLM、Action 凭据由 Radar 自己安全保存。
- REST API 作为通用 Agent 接口；MCP 作为独立适配层。
- Git 管理、可回滚、分阶段交付。
- 数据 TTL、数据库容量上限、超限清理和容量告警。
- 来源失效、规则变更、动作失败的可解释状态。

### 暂缓

- Source webhook 输入。
- MoviePilot 专用动作及下载业务。
- 复杂插件脚本执行。
- 让 Agent 成为 Radar 的运行前提。
- 自动修改用户规则或自动替换失效来源。

## 4. 非目标

- 不依赖 Hermes 才能采集、判断、保存事件或发送通知。
- 不把新增来源类型硬编码进核心业务层。
- 不让 LLM 直接任意调用外部 URL 或绕过 Action 配置。
- 不因来源失效删除 Watcher、历史事件或来源配置。
- 不因规则修改自动重跑全历史或撤回已执行动作。
- 不默认引入向量数据库、Redis、Embedding 或其他非必要基础设施。

## 5. 产品原则

- 用户界面优先于内部概念暴露。
- 事件是事实，Action 是对事实的响应。
- 来源可以分组，原始来源身份不能丢失。
- 不确定时保守：不强行合并、不静默降级、不静默丢数据。
- 配置变化版本化；默认只影响未来数据。
- 所有失败都应可见、可解释、可重试或可处置。
