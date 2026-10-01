# Kestrel Design System · Foundation 规范（P0）

这份文档和代码是同一个来源：`apps/web/src/design/tokens/`（Foundation）→ `plugins/vuetify.ts`（主题映射）
→ `styles/foundation.scss` + `styles/components.scss`（变量消费）→ `App*` 组件（P1）→ 页面。
页面只负责**信息结构 + 数据 + 业务交互**，不写色值、不写按钮/卡片/弹窗样式、不写间距数值。

在线验收：开发环境打开 `/design`（开发专用路由，生产构建不打包）。

## 分层与依赖方向

```
Foundation（design/tokens/color.ts + foundation.ts）
    ↓ 只向下依赖
Vuetify Theme（plugins/vuetify.ts：色值、断点、圆角、密度）
    ↓
CSS 变量 --k-*（applyThemeVars 注入 <html>）
    ↓
App* 组件（P1：AppButton / AppCard / AppDialog / AppStatus / AppPage / AppSection …）
    ↓
页面（views/*）
```

反面例子（禁止）：页面里出现 `#4f6ef7`、`margin: 10px`、`<v-btn color="primary" class="my-3">` 这种自己定视觉的写法。

## 1. 颜色

- 唯一来源：`design/tokens/color.ts` 的 `THEMES`（亮暗各一套）。要出多套颜色模板＝加一条记录 + 一条 `theme.<id>` 文案。
- 语义变量：`--k-bg / --k-rail / --k-panel / --k-panel-2 / --k-border / --k-border-soft /
  --k-text / --k-muted / --k-faint / --k-accent / --k-accent-soft / --k-blue / --k-ok / --k-warn / --k-err`。
- 对比度底线（测试里守着）：正文 ≥ 7:1，次要文字 ≥ 4.5:1，最弱提示 ≥ 3:1，
  强调/状态色**当文字用**也 ≥ 4.5:1，主要按钮的白字 ≥ 4.5:1。
- 因此亮色下强调色定为 `#3b5cf0`（原 `#4f6ef7` 只有 3.89:1），成功 `#0b7d3d`、提醒 `#8a5d04`、错误 `#c62f34`。
- `--k-on-accent` 是"压在强调色上的文字色"：亮色主题用白，暗色主题用深色 ——
  因为暗色的蓝既做不到"当文字够亮"又做不到"白字压上去够清楚"，所以主要按钮的文字色单独一个 token。
- 主题三态：白天 / 跟随系统 / 黑夜，默认跟随系统（`stores/ui.ts`）。
- 变量与 Vuetify 主题类（`v-theme--<id>`）都挂在 `<html>` 上：弹窗/菜单/抽屉被传送到 `<body>`，
  不挂根节点它们会掉回默认亮色（这一条是 P0 实测发现的，已修）。

## 2. 排版

字号七档（`--k-fs-*`）：`label 11 / meta 12 / body 13 / bodyLg 14 / title 16 / h1 20 / display 24`。
行高两档：`tight 1.3`（标题）/ `normal 1.5`（正文）。字重三档：`400 / 500 / 600`。
数字、路径、时间戳一律 `font-mono` + `tabular-nums`（源码里直接用 `.font-mono`）。
字体先用系统栈（`--k-font-sans` / `--k-font-mono`），不引 webfont。

## 3. 间距

只用七档（`--k-space-1..7`）：`4 / 8 / 12 / 16 / 24 / 32 / 48`。
出现 10px、14px、18px 这类值就算违规。

## 4. 圆角

`--k-radius-sm 3px`（小徽标、标签）/ `md 4px`（卡片、输入、按钮）/ `lg 6px`（浮层：弹窗、菜单）/ `pill`（状态点、开关）。

## 5. 边框与阴影

- 分层靠**细边框 + 底色**：卡片 `1px var(--k-border)`、卡内分隔 `var(--k-border-soft)`。
- 阴影只两级且只给浮层：`--k-elev-1`（菜单/气泡）、`--k-elev-2`（弹窗/抽屉）。卡片不用阴影。

## 6. 密度（括号里是 P0 真机实测值）

`--k-control-h` 32px（按钮；实测桌面按钮 32、小号 26）、`--k-field-h` 40px（输入框/选择框，
Vuetify `density: compact` 实测正好 40）、`--k-control-h-touch` 44px（触摸端按钮与输入框都抬到这里，
实测 <900px 时输入框 44、按钮 44）、`--k-row-h` 36px（列表行）、`--k-pad-card` 16px、
`--k-pad-page` 32px（桌面）/ 16px（手机）。

## 7. 响应式

断点：`sm 600`（大手机）、`md 900`（桌面布局开关）、`lg 1280`、`xl 1440`（宽屏只加留白）。
组件各有自己的响应式规则（写在 `styles/components.scss`），不是"899 手机 / 901 全桌面"一刀切：
- 手机 <600：页面内边距 16，卡片内边距收紧一档；
- 600–899：页面内边距 24，按钮/控件抬到 44 触摸高度，设置行改上下排列；
- ≥900：三列/两列布局、设置行左右排列、页面内边距 32；
- ≥1440：只加左右留白，不放大内容。

## 8. 页面宽度策略（AppPage 的能力）

`app-page--narrow 720`（表单、设置）/ `--default 1120`（普通页）/ `--wide 1440`（仪表盘、多列配置）/
`--full`（不限宽）。像素值待真机截图确认后再定；**不写死一个全局 max-width**。

## 9. 组件清单（P0 只定义视觉，P1 才包成组件）

Button、Input、Select、Switch、Status/Badge/Tag、Card/Surface、Dialog、EmptyState、Loading/Skeleton、Hint/Toast。
样式全在 `styles/components.scss`（类名前缀 `app-`），页面不得复制。

## 10. 明确不做

渐变、装饰性阴影、大圆角、五颜六色的 KPI 卡、每个区块都做成卡片、所有内容同一视觉权重。
