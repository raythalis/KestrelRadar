# Radar V2 领域模型

状态：草案，待 Phase 0 评审冻结

## 1. 用户可见模型

用户只需要理解三栏：

```text
Sources → Watchers → Actions
```

内部模型不得强迫用户理解；页面使用向导、预览和状态提示完成配置。

## 2. Source

Source 是一个可获取数据的配置实例，包含连接器类型、地址、认证引用、字段映射、健康状态和采集策略。

统一连接器输出：

```text
source_id, title, url, content, author, published_at, raw_payload, fetched_at
```

新增普通来源优先使用通用配置或插件，不修改核心事件业务。

## 3. Source Group

Source Group 是多个 Source 的可复用逻辑集合。分组不删除原始来源身份；采集、错误和证据仍归属于具体 Source。

## 4. Watcher

Watcher 是用户的一条监听配置，至少表达：来源/来源组、关注描述或目标、观察类型、筛选条件、处理模式、运行调度、失败策略和 Action 绑定。

一个 Watcher 可以关联多个来源和多个目标；一个 Source 或 Action 可以被多个 Watcher 复用。

## 5. Item 与 Event

Item 是某次采集得到的原始/标准化内容；Event 是一个可供用户理解和处理的事实事件。

多个 Item 可以归并为一个 Event，但原始 Item 与来源证据必须保留。

## 6. Action

Action 是对 Event 的响应，例如通知、保存、汇总、调用已配置接口。Action 不是事件本身。

一个 Event 可触发多个 Action；每个 Action 独立拥有状态、幂等键、重试记录和错误记录。

## 7. Invocation

Invocation 是触发处理的方式，不是 Action：

- scheduled_collect：定时采集
- event_triggered：事件产生后处理
- scheduled_digest：定时汇总
- on_demand_query：用户或 Agent 主动查询

主动查询返回结果，不默认产生持久化通知。

## 8. 状态不变量

- Source 失效不得删除 Watcher、历史 Item 或 Event。
- 规则版本变化不得修改已执行 Action 的历史事实。
- LLM 判断是带模型/提示版本的处理记录，不是真理来源。
- LLM 不确定时，事件归并默认不合并。
- Action 失败不得回滚已保存 Event，也不得阻止其他独立 Action。
- 核心业务不依赖 Hermes 或其他 Agent。
