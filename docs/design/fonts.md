# 字体

本轮（P2 之后的 Design 阶段第一步）把字体从「纯系统字体栈」换成**自托管的 Inter + JetBrains Mono + 裁剪版图标字体**。
原则：**只换字体族**，字号、行高、字重档位一个字都没动（`design/tokens/foundation.ts` 里的 TYPE / LINE_HEIGHT / WEIGHT 不变）。
中文**不引 webfont**，走系统中文回落。

## 现在是什么

| 用途                         | 字体                                   | 文件                                                   | 体积   |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------ | ------ |
| 普通界面（英文、数字、符号） | Inter（可变）                          | `src/assets/fonts/inter-variable-latin.woff2`          | 48 KB  |
| 代码、日志、IP、技术串       | JetBrains Mono（可变）                 | `src/assets/fonts/jetbrains-mono-variable-latin.woff2` | 40 KB  |
| 图标                         | Material Design Icons（裁剪版，85 个） | `src/assets/fonts/materialdesignicons-subset.woff2`    | 4.8 KB |
| 中文                         | 系统中文（苹方 / 微软雅黑 / 思源等）   | —                                                      | 0      |

- `@font-face` 在 `src/styles/fonts.scss`（文本字体，`font-display: swap` + `unicode-range` 限 latin）
  与 `src/styles/mdi.scss`（图标字体，`font-display: block`）。
- 字体族写在 `design/tokens/foundation.ts` 的 `--k-font-sans` / `--k-font-mono` 栈首，全站只消费这两个变量。
- 文件放 `src/assets/`（不是 `public/`）：构建后带内容哈希，浏览器可以长缓存，改字体自动换 URL。
  生产部署给 `/assets/*` 配 `Cache-Control: public, max-age=31536000, immutable` 即可。
- 许可与再生成方法：`src/assets/fonts/README.md`（Inter / JetBrains Mono = SIL OFL 1.1，
  图标 = Apache-2.0 / Pictogrammers Free License，许可原文都在同目录）。

## 为什么这么选（实测数据）

三套方案在真实构建上实测（原始数据见当时的评估报告）：

| 方案                                           | 首屏字体请求 | 首屏字体体积 |
| ---------------------------------------------- | ------------ | ------------ |
| Inter + JB Mono（latin）                       | 2            | 87 KB        |
| 再叠 Noto Sans SC 分片（unicode-range 303 片） | 19           | 1024 KB      |
| 再叠中文子集（可变，848 字）                   | 3            | 277 KB       |

- **分片方案每进一个新页面还要再下 ~180 KB**（/channels +3 片、/models +3 片），子集方案去过一次之后零请求。
- `font-display: swap` 实测不阻塞：字体故意晚 2 秒时，文字 119 ms 就出现；`block` 要等 2182 ms。
- 字体与亮暗主题无关：切主题新增字体请求 0。
- 当前最大的字体负载其实是**图标字体**：全量 `@mdi/font` 是 394 KB / 7448 个图标，
  而项目只用到 85 个 → 裁到 4.8 KB，CSS 也从 408 KB 降到几 KB。

**暂不做**：中文 webfont（Noto Sans SC 子集）—— 等第一步验收后单独定。真要统一跨平台中文字形时，
加一份可变子集（当前界面用字 ≈ 190 KB）并把系统中文留在回落链尾部即可。

## 怎么验证

- 单测：`src/__tests__/fonts.spec.ts`（字体文件、字体栈、font-display、字号字重档位没动）、
  `src/__tests__/mdi-icons.spec.ts`（源码里的图标 + Vuetify 内置图标集逐个对裁剪清单校，漏了会红）。
- 生产构建后看 `dist/assets/`：应有 3 个 `.woff2`（带哈希），没有 394 KB 的图标字体。
- 真机：普通界面是 Inter、代码/日志区是 JetBrains Mono、中文是系统字、图标不空白；切亮暗不产生新的字体请求。

## 加图标怎么办

裁剪清单 = 前端源码里的 `mdi-*` ∪ Vuetify 内置图标集（`vuetify/lib/iconsets/mdi.js`）。
加了新图标要**重跑生成命令**（见 `src/assets/fonts/README.md`），否则图标渲染成空白；
忘了重跑时 `mdi-icons.spec.ts` 会直接报出缺哪几个。
