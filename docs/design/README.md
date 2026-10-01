# 设计基准

界面长什么样，以本目录的 `config-management.html` 为准（配色、间距、圆角、组件形态都照它来）。
代码里只有两个地方管“长什么样”：

| 关注点 | 位置 | 说明 |
| --- | --- | --- |
| 色值 / 主题 | `apps/web/src/design/tokens.ts` | 全项目唯一的色值来源，包含所有 `--k-*` 变量的取值 |
| 结构 / 间距 / 组件样式 | `apps/web/src/styles/main.scss` | 布局与组件形态，颜色一律引用 `var(--k-*)`，不写死 |

组件里**不允许**出现写死的颜色（`#rrggbb`、`rgba(...)`），只能用 `var(--k-*)`。Vuetify 的主题色也由
`tokens.ts` 生成（`vuetifyColors()`），不单独维护一份。

## 变量表

| CSS 变量 | 用途 |
| --- | --- |
| `--k-bg` | 页面底色 |
| `--k-rail` | 左侧导航底色 |
| `--k-panel` | 卡片、顶栏等面板底色 |
| `--k-panel-2` | 面板内的次级底色（三列、内嵌卡片） |
| `--k-border` | 常规描边（卡片、输入框） |
| `--k-border-soft` | 更淡的分隔线（导航右边、顶栏下边） |
| `--k-text` | 正文 |
| `--k-muted` | 次要文字（说明、元信息） |
| `--k-faint` | 最弱提示（占位、计数） |
| `--k-accent` | 强调色（主按钮、选中态、状态点） |
| `--k-accent-soft` | 强调色的浅底（选中项背景） |
| `--k-blue` | 第二强调色（链接、信息类 chip） |
| `--k-ok` / `--k-warn` / `--k-err` | 正常 / 注意 / 出错 |
| `--k-radius` | 圆角 |
| `--k-shadow` | 卡片阴影 |

变量由 `applyThemeVars()` 写到 `<html>` 上（不是挂在某个组件里），这样弹窗、菜单这些被传送到
`body` 的内容也能继承到同一套颜色。

## 加一套主题

1. 在 `tokens.ts` 的 `THEMES` 里加一条（`id`、`dark`、`labelKey`、完整 `tokens`）。
2. 在 `apps/web/src/locales/{zh-CN,en}.ts` 里补一条 `theme.<key>` 文案。

就这两步：Vuetify 主题、顶栏的切换按钮、变量注入都会自动跟上，因为都从 `THEMES` 生成。

## 组件样式约定

沿用设计稿里的类名语义，避免每个页面各写一套：

| 类名 | 形态 |
| --- | --- |
| `.k-card` | 面板底色 + 1px 描边 + `--k-radius` 圆角 |
| `.k-tag` / `.k-tag--accent` / `.k-tag--ok` / `.k-tag--off` | 小圆角标签（关键词、计数量） |
| `.status-dot` + `--ok` / `--err` / `--warn` / `--busy` | 状态点：可点击触发连通性测试，测试中转圈 |
| `.empty-state` | 空状态（虚线框 + 次级底色） |
| `.column-panel` / `.column-head` | 分组里的三列容器与列头 |
| `.template-preview` | 模板正文的只读预览（等宽字体） |

`apps/web/src/__tests__/design-tokens.spec.ts` 会守住这些约定：主题齐全、色值合法、
组件文本都翻译过、变量能正确注入。
