# Phase 1 — 独立骨架与只读界面（给 cc 的实施任务）

仅在本仓库工作；禁止改 `/opt/data/radar`、Hermes 全局配置、生产服务、Cron、外部仓库。不要读取或输出任何凭据。读 `docs/` 与本文件；未决业务默认值不得替用户决定。只实现 Phase 1，不进入 Phase 2。

## 测试先行

先提交或至少运行失败测试，证明：隔离数据库初始化、健康接口、Sources/Watchers/Actions 只读 API 的空状态契约、首页三栏可访问，以及没有外部采集/通知调用。记录失败测试再实现到通过。

## 最小实现

- 独立 Python 后端（选简单、可测试的 HTTP 框架或标准库），SQLite 隔离数据目录及幂等迁移；只读列表 API 和 `/health`。不要制造虚假生产数据。
- `frontend/` 使用 Vue 3 + Vite + TypeScript + Tailwind CSS；Naive UI 用于状态/提示；Vue Flow 作为来源→监听→动作的只读可视预览。即便空数据库也显示真实空状态。三栏布局保留；不实现拖拽保存或配置写 API。
- TypeScript 保持可读，让熟悉 Vue 2/JS 的维护者易于上手；没有复杂状态框架和不必要依赖。注意 Tailwind Preflight 与组件库的样式边界。
- Dockerfile 多阶段构建前端并打包后端静态服务；compose 仅供本地隔离验证，不写死公网端口，不提供生产凭据。`.gitignore` 已存在，不提交数据库/缓存/secret。
- README 增加实际运行与验证方法；新增具体的 Phase 1 说明，不修改已冻结的 Phase 0 需求结论。

## 验证与停止

运行全部测试、TypeScript 检查、前端 build；若 Docker 可用则隔离启动并实际 GET 健康/API/首页。不能验证的项如实列出。输出文件清单、失败→通过证据、命令和阻断。不要自行进入下一阶段、部署生产、发送消息或触发采集。不要执行 git commit；由 Hermes 验证后提交。
