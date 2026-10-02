# 主题色支持情况审计（2026-10-02，只读）

范围：Kestrel 前端（P0 之后的新 Design System + 仍在跑的旧页面）。全程只读，未改任何文件。

## 结论

主题色支持是**通的**，没有发现断链：亮暗两套色在正式页面、/design、以及所有浮层（弹窗、下拉菜单、cron 生成器）
里都跟着切换，跟随系统也是实时的。下面每条都有实测证据。

## 1. 架构：色值只有一处来源

`design/tokens/color.ts` 是全项目唯一写色值的地方，其余全部由它派生：

| 出口 | 实现 |
| --- | --- |
| CSS 变量 `--k-*` | `applyThemeVars()` 把 `themeVars()` 灌到 `<html>`（不是 `#app`） |
| Vuetify 主题 | `plugins/vuetify.ts` 用 `vuetifyColors()` 从同一份 tokens 生成 `kestrelLight` / `kestrelDark` |
| 浮层不掉色 | `v-theme--<id>` 类同时挂在 `<html>` 上——弹窗/菜单/抽屉被 teleport 到 `body`，不在 `<v-app>` 里 |
| 原生控件 | `color-scheme: light/dark` 跟着主题设（滚动条、输入框） |

## 2. 切换与持久化（实测）

- 顶栏三态段控件：`theme-light` / `theme-system` / `theme-dark`，偏好写入 `localStorage.kestrel-ui`（实测值 `{"theme":"system","locale":"zh-CN"}`）。
- 跟随系统是**实时**的：用 CDP 模拟 `prefers-color-scheme` dark → light → dark，`<html>` 的 `data-theme` 与
  `v-theme--*` 类跟着变，不需要刷新（`layouts/AppShell.vue` 里注册了 matchMedia 监听）。

## 3. 覆盖率实测（亮 ↔ 暗逐项对拍）

对拍方式：切换主题后读同一元素的 `getComputedStyle` 的 background / color / border，逐个比对是否变化。

- **/design**：`body`、`.app-card`、`.biz-card`、`.app-btn`（含主要按钮）、`.app-tag`、`.app-status` 与状态点、
  区块标题、`.v-field`、段控件 —— 全部随主题变化 ✓
- **旧页面 /config**：`body`、`.app-shell`、`.v-card`、`.v-btn` —— 同样全部随主题变化 ✓（旧页面也在同一套 tokens 上）
- 主要按钮文字用的是 `onAccent`：暗色下是深色字 + 亮蓝底（5.17:1），亮色下是白字 + 蓝底（5.28:1）✓

## 4. 浮层实测（暗色）

- 动作弹窗：底 `rgb(20,22,32)`（= `--k-panel` 的暗色值）、描边 `rgb(36,39,56)` ✓
- 下拉菜单：`.v-list` 与 `.v-sheet` 都带 `v-theme--kestrelDark` 类，底同为 `rgb(20,22,32)` ✓
  （挂 `contentClass: app-select-menu` 也在 ✓）
- cron 生成器浮层：底 `rgb(20,22,32)`、文字取暗色正文色、选中项取 accent ✓

## 5. 硬编码色值

| 位置 | 结果 |
| --- | --- |
| `styles/{components,biz,foundation}.scss` | 0 处（只有 `color-mix()` 与 `var(--k-*)`） |
| `components/**`、`views/**` 的模板内联样式 | 没有色值（只有宽度、间距、以及 /design 的色板本身） |
| 旧 `styles/main.scss` | 1 处 `color: #fff`（旧样式，P6 清） |
| 组件里 `var(--v-*)` 直连 Vuetify 变量 | 0 处（只认 `--k-*`） |

## 6. token 完整性

按 `colorVars()` + `foundationVars()` 的规则算出共 **60 个** `--k-*` 变量，再扫全部源码里 `var(--k-*)` 的用法：

- **用了但没定义：0 处**（没有拼错的变量名）
- 定义了但没人用：`--k-bp-{sm,md,lg,xl}`、`--k-field-h`、`--k-fs-bodyLg`、`--k-fs-display`、
  `--k-fw-regular`、`--k-pad-card-lg`、`--k-pad-page`、`--k-space-7`
  → 属于 DS 对外留的口子（断点、字号档、页面留白），不是死代码；只有 `--k-space-7`（48px）目前确实没人用。

## 7. 对比度（WCAG 对比度比）

| 组合 | 亮色 | 暗色 |
| --- | --- | --- |
| 正文 on 底 | 17.35 | 15.35 |
| 正文 on 面板 | 19.08 | 14.35 |
| 次要文字 muted on 面板 | 5.98 | 7.04 |
| 最弱文字 faint on 面板 | 5.24 | 5.19 |
| accent on 面板 | 5.28 | 4.83 |
| onAccent on accent | 5.28 | 5.17 |
| blue / ok / warn / err on 面板 | 4.88–5.76 | 5.34–8.13 |

全部文字组合都 ≥ 4.77，高于正文 4.5 的门槛；描边 `--k-border` 只有 1.2–1.3，这是发丝线该有的值（不是文字）。

## 8. 第三方组件

`@vue-js-cron/vuetify` 的 `dist/vuetify.css` 里**一个色值都没有**（也没有硬连 `--v-*`），
它只负责排版，颜色全部来自它渲染的 Vuetify 组件 —— 所以自动跟着我们的主题走（第 4 节已实测暗色）。

## 9. 小缺口 / 待他定夺

1. `/design` 的色值清单只显示**当前**主题的值（切主题跟着变）；`allThemeVars()`（两套并排）目前只有测试在用。
   要不要在 /design 加一栏「另一套主题的值」方便两边对拍？
2. 旧 `main.scss` 里那处 `#fff` 留给 P6 清理，现在不动。
3. 上面第 6 节列的那些「定义了没人用」的变量里，`--k-space-7` 要不要删（其余建议留着，是 DS 的对外口子）。

---

# 追加：主题色（accent）能不能换（2026-10-02 澄清后重查）

上面第 1–9 节查的是**亮暗模式**；这里回答**主题色**：现在只有一套蓝色，而且没有任何切换机制。

## 现状（证据）

| 问题 | 答案 |
| --- | --- |
| 主题色值在哪 | 只在 `design/tokens/color.ts`：亮 `accent: #3b5cf0`、暗 `accent: #5b7bf8`（外加 `accentSoft` / `onAccent` / `blue`） |
| 别处还写过蓝色吗 | 没有。全项目再无第二处（grep 过 4 个色值的十六进制） |
| 谁在消费它 | 只经 `--k-accent*` 变量 → `styles/{foundation,components,biz}.scss`、旧 `main.scss`、`/design` 色板 |
| 有切换入口吗 | 没有。偏好只有一个维度 `light / system / dark`（`localStorage.kestrel-ui`），设置页没有任何「外观」分组 |

## 为什么加主题色是「改一处」的事

派生链已经是单源的，换色板不用碰组件：

```
color.ts 的 THEMES  ──┬─→ --k-* CSS 变量（applyThemeVars 灌到 <html>）
                      ├─→ Vuetify 主题（vuetify.ts 用 Object.fromEntries(THEMES.map(…)) 自动注册）
                      └─→ v-theme--<id> 类（按 THEMES 逐个开关，浮层不掉色）
```

**现在的耦合点**：`THEMES` 里的一条同时扮演三个角色——① 亮暗模式 ② 色板 ③ 用户可见的偏好项
（`THEME_PREFERENCES` 就是 light/system/dark）。所以「主题色」要独立成第二个轴，不能只是往 THEMES 里塞。

## 要做的事（还没做，等确认）

1. `color.ts`：tokens 拆成两轴——**中性面（跟亮暗走）** + **主题色（跟色板走）**，再组合生成 `THEMES`。
   建议归属：
   - 跟主题色走：`accent`、`accentSoft`、`onAccent`（`onAccent` 必须按该主题色的亮度算）
   - 跟亮暗走：`bg` / `rail` / `panel` / `panel2` / `border` / `borderSoft` / `text` / `muted` / `faint` + 阴影
   - **不要动**：`ok` / `warn` / `err`（语义色，换主题色不该跟着变）；`blue`（info）建议固定
2. `stores/ui.ts`：偏好加第二个值（`accent: 'blue' | …`），`resolveTheme` 组合出主题 id。
3. `THEME_PREFERENCES` 旁边加一份主题色清单 + `theme.accent.*` 文案；顶栏或设置页给入口。
4. `layouts/AppShell.vue`：顶栏要不要放色板入口（现在只有亮暗三态段控件）。
5. `/design`：色板清单现在只列当前主题，加色板切换才能逐套对拍。
6. 测试：`app-shell.spec.ts`、`design-foundation.spec.ts` 里写死了 `kestrelDark` / `kestrelLight`，id 命名变了要跟着改。
7. 建议加个**对比度守卫**：新主题色的 `onAccent` 对它本身、`accent` 对面板都要 ≥ 4.5，塞进去就跑测试，
   避免以后有人挑个亮黄主题色导致白字看不清。

## 待定夺

- 主题色要不要连带 `blue`（info 色）一起变？我建议不。
- 入口放顶栏还是设置页？（设置页目前还没有外观分组）
- 要几个主题色、哪几个？（或者第一版只保留现有蓝，先把轴做出来）
