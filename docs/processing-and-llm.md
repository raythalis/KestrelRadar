# Radar V2 处理与 LLM 规格

状态：草案，待 Phase 0 评审冻结

## 1. 处理模式

- `rules_only`：纯代码，确定性、无 Token。
- `rules_then_llm`：规则初筛后将候选交给 LLM。
- `llm_only`：预留，不作为首版后台默认。

## 2. LLM Provider

Watcher 引用 Provider Profile，而不绑定某家实现。Profile 可指向 OpenAI-compatible API 或本地 Ollama，并包含模型、超时、重试和成本提示所需元数据。

密钥由 Radar 自己保存，前端不回显，日志不记录明文。

## 3. LLM 可处理内容

- 语义相关性
- 目标与别名识别
- 重要性分类
- 摘要与标签
- 事件合并辅助

采集、URL 去重、TTL、动作幂等、重试和最终动作权限由代码负责。

## 4. LLM 结果落库

保存结构化判断以及 provider、model、prompt_version、input_hash、时间和证据引用。结果可重新评估，不覆盖原始 Item 或已执行 Action。

## 5. 不可用与降级

默认 LLM 不可用即失败，记录错误并按 Watcher 重试/失败通知执行。只有用户显式打开降级开关时，才允许转为纯规则；结果必须标注 `degraded=true`。

## 6. 事件合并

先由代码产生候选簇；LLM 可输出 `merge`、`do_not_merge` 或 `uncertain`。`uncertain` 默认不合并。合并决策及模型证据落库。
