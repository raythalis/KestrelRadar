# Phase 0 规格复核与开发交接

状态：评审稿；不得据此自动进入 Phase 1

## 复核结论

- 三栏界面是用户配置视图，内部 Item/Event/规则版本是实现细节。
- 独立 Docker 服务、凭据存储和通知模块不依赖 Hermes。
- 采集、Watcher 判断、即时动作及定时汇总相互独立；用户查询是只读调用，不是推送动作。
- 同一来源可被多个 Watcher 复用；多个来源可以组成组；一个 Watcher 可关联多个目标和动作。
- LLM 失败默认报错；用户显式启用降级后才能转纯规则；判断与合并记录保留模型及版本。
- 来源失效保留规则和历史；规则变化版本化，新数据采用新版本，旧数据默认不回溯。
- 新来源通过通用协议配置或连接器插件接入，不改事件核心；非标准登录和协议不承诺零开发。

## 旧 Radar 只读复用矩阵（初步）

| 旧模块 | 建议 | 理由 |
| --- | --- | --- |
| normalize.py | 可参考/移植并补测试 | URL、标题、指纹、时间归一化契约 |
| adapters/rss.py、adapters/rsshub.py | 适配后复用 | feed 解析与 RSSHub 路由分层经验；新连接器契约待定义 |
| collect.py、cycle.py | 复用测试经验，不直接搬调度 | 单源失败隔离、去重、时间预算；V2 调度拆分 |
| events.py、validate.py | 保守归并与三态判据作为参考 | V2 事件身份及可选 LLM 辅助尚未冻结 |
| db.py、bindings.py、registry.py | 不直接迁移 schema | 旧库带历史来源/绑定语义，V2 需独立迁移基线 |
| relevance.py、query.py、render.py、tools.py | 不整包复制 | 旧投递、Hermes 工具、查询口径与独立应用不同 |

上表仅基于文件清单与既有 README 的设计描述，是代码复用候选，不是逐函数兼容性承诺。Phase 1/2 按需只读审查函数契约及测试后再确定复制或重写。

## 前端选型（Vue/Tailwind 已确认；组件库与画布选型为推荐）

已确认采用 **Vue 3 + Vite + TypeScript + Tailwind CSS**。用户日常熟悉 Vue 2 + JavaScript：首期采用易读的 `<script setup>`、渐进式 TypeScript、清晰组件边界，不以高级类型体操增加维护负担。后端仍提供独立 REST API；构建后的静态资产由 Radar 服务提供，生产无需常驻 Node 容器。

组件库拟用 **Naive UI**（表单、提示、状态、抽屉），拖拽画布拟用 **Vue Flow**（来源 → 监听 → 动作的可视连接）；两者均为 Vue 3 生态。Tailwind 用于布局与间距，组件库负责交互组件；实施时验证 Tailwind Preflight 与组件样式冲突。画布节点和连线只是配置视图，保存时转换成与 REST/表单共用的结构化数据；必须保留表单编辑途径，不让拖拽成为唯一方式。Phase 1 只交付三栏只读界面与画布的可见只读预览，不提前实现拖拽写配置。

## Phase 1 建议边界

- 失败测试：隔离测试库初始化及迁移、只读列表 API 的响应契约、三栏页面可加载并显示空状态与示例数据、无真实外部请求和动作。
- 最小实现：独立服务骨架、配置加载、首版 migration、只读 API、Vue 三栏只读界面、Dockerfile/compose 开发验证。
- 验证：自动测试、构建产物、启动隔离容器并实测健康接口与页面/API；不绑定生产端口，不接真源，不发消息。
- 回滚：停止并删除隔离测试容器/数据目录；旧 Radar 不受影响。

## 已解决与后续待定事项

1. 现有 Sudocode 凭据对 `https://api.sudocode.chat/v1/messages` 的最小直接请求返回 200，模型实际 ID 为 `gpt-6-sol`（不是 `gpt6sol`）。但 cc 的两次实测（包括带/不带 `--bare`）均在工具调用前返回 selected model issue，退出码 1、使用量 0；因此 **直接 API 通不等于 cc 可用**。未更改全局 cc 的 DeepSeek 设置；聊天中另提供的 Key 未使用，建议轮换。Phase 1 的 cc 实施因此暂缓，需先解决兼容/鉴权或由用户选择 Hermes 自行实现。
2. 采用新模型的实际费用取决于中转站账单；cc 内置 `costUSD` 不能视为实扣。实施时限制轮次并报告 token 使用量，不声称准确计费。
3. Vue 3、Vite、TypeScript、Tailwind 已获确认；Naive UI 和 Vue Flow 作为本阶段推荐落地选型。
4. Web UI 登录和网络暴露、数据库默认保留值、通知渠道等后续部署项仍保持未定，不由 cc 擅自填成生产默认。
