# P5.5 · 主题设计（含主题色轴）· 方案草案

状态：**方案已定，延后执行**（2026-10-02 用户：方向按组合式走，「不要 MP 的方案」，但「我们放到后面 P 去做」）。

阶段位置：**P5.5，P6 之前**（2026-10-02 用户补充）。开工时按本文执行；入口归属与设置页（P3.5 的三个页）一起定。
即在 `color.ts` 里把色值拆成两个轴——**中性面（跟亮暗走）× 主色（跟色板走）**——再组合生成主题条目。
不采用 MP 那种「固定主题清单 + 运行时改写 primary」的覆盖式做法。

## 一、形态

- 主题 id：`kestrel-<mode>-<palette>`，例如 `kestrel-light-blue`、`kestrel-dark-blue`。
  现有 id `kestrelLight` / `kestrelDark` 退役（只在内部使用，`localStorage` 存的是 `light|system|dark` 这个**偏好词**，不受影响；
  只有两个测试断言与 /design 的展示文案要跟着改）。
- 条目数：2 种亮暗 × 6 个色板 = 12 条，`vuetify.ts` 与 `applyThemeVars` 都是按 `THEMES` 派生的，**不用改**。
- 语义色（`ok` / `warn` / `err`）与 `blue`（info）**不随主题色变**。

## 二、六个色板（已逐个算过对比度，全部 ≥ 4.5）

刻意避开语义色（绿=成功、琥珀=警告、红=错误），避免「主色看起来像报错」。

| 色板 | 亮色主色 | 暗色主色 | 主色/面板（亮·暗） | 前景/主色（亮·暗） |
| --- | --- | --- | --- | --- |
| 蓝 `blue`（默认，现有值） | `#3b5cf0` | `#5b7bf8` | 5.28 · 4.83 | 5.28 · 5.17 |
| 靛 `indigo` | `#4b46d6` | `#8f8bff` | 6.67 · 6.27 | 6.67 · 6.71 |
| 紫 `violet` | `#7a3fd0` | `#c08bff` | 6.09 · 7.19 | 6.09 · 7.69 |
| 青 `teal` | `#0f766e` | `#3fc9b8` | 5.47 · 8.80 | 5.47 · 9.42 |
| 洋红 `magenta` | `#c02f7a` | `#f57ab4` | 5.34 · 7.14 | 5.34 · 7.64 |
| 青灰 `slate` | `#456075` | `#8aa6c0` | 6.60 · 7.12 | 6.60 · 7.62 |

派生规则（跟现有两套保持一致）：

- `accentSoft` = 主色同值的 `rgba(..., 0.10)`（亮）/ `rgba(..., 0.16)`（暗）
- `onAccent` = 按主色亮度在 `#ffffff` / `#0c0e15` 里挑对比度更高的那个（上表「前景/主色」列即结果）

## 三、要改的地方（8 处）

| # | 文件 | 改什么 |
| --- | --- | --- |
| 1 | `design/tokens/color.ts` | 抽出 `SURFACES`（亮/暗各一套中性面）+ `PALETTES`（6 套主色，每套含亮/暗两值），组合生成 `THEMES`；导出 `PALETTES` / `DEFAULT_PALETTE` / `resolveThemeId()`；加 `rgbaFromHex()` 与 `readableOnColor()` 两个小工具 |
| 2 | `design/tokens/index.ts` | `resolveTheme` 增加 palette 参数；`allThemeVars()` 只返回当前色板的两套（/design 逐项展示用） |
| 3 | `stores/ui.ts` | 偏好加 `palette`（默认 `blue`）；读写 `localStorage.kestrel-ui` 时兼容旧数据（认不出就回默认） |
| 4 | `layouts/AppShell.vue` | 顶栏亮暗段控件旁加一个**色板入口**（一个圆点按钮，点开列出 6 个色点） |
| 5 | `locales/{zh-CN,en}.ts` | `theme.palette.{blue,indigo,violet,teal,magenta,slate}` 名称 |
| 6 | `views/DesignView.vue` + `design/lab-copy.ts` | /design 显示当前色板名（切换走顶栏那个入口） |
| 7 | `plugins/vuetify.ts` | **不用改**（按 `THEMES` 自动注册 12 条） |
| 8 | 测试 | 新增 `theme-palette.spec.ts`：① 6 套 × 亮暗的对比度守卫（≥4.5）② id 与派生值正确 ③ 每套色板的 accent 两两不同；改 `app-shell.spec.ts` / `design-foundation.spec.ts` 里写死的旧 id |

## 四、做法与验收（按既有节奏）

1. **测试先行**：先写 `theme-palette.spec.ts`，跑到失败（RED）。
2. 实现 1–6，跑到通过（GREEN）。
3. 浏览器实测：顶栏切 6 个色板 × 亮暗，确认主色、淡色底、选中态、浮层（弹窗/下拉）都跟着变；
   旧页面也扫一遍（它们也在同一套 tokens 上）。
4. 汇报：改动清单 + 实测截图不必给（用户自己看）+ 对比度数字。

## 五、回滚

单个 commit，`git revert` 即可；`localStorage` 里认不出的 palette 一律回默认，不会把人卡在与主题无关的状态。

## 六、待确认（开工前）

1. **六个色板**：蓝、靛、紫、青、洋红、青灰 —— 可以吗？（都避开了语义色的色相）
2. **入口位置**：先放顶栏（设置页还没做，P5 才轮到），还是先只在 /design 里切？
3. **`blue`（info 色）要不要跟着主题色变**：我建议不动（info 是语义色，不该随主题色走）。
