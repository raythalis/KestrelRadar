# 字体

界面使用**自托管的 Inter + JetBrains Mono + 裁剪版图标字体**。
原则：**只换字体族**——字号、行高、字重档位不变。
中文**不引 webfont**，走系统中文回落。

## 现在是什么

| 用途                         | 字体                                   | 文件                                                   | 体积   |
| ---------------------------- | -------------------------------------- | ------------------------------------------------------ | ------ |
| 普通界面（英文、数字、符号） | Inter（可变）                          | `apps/web/src/assets/fonts/inter-variable-latin.woff2`          | 48 KB  |
| 代码、日志、IP、技术串       | JetBrains Mono（可变）                 | `apps/web/src/assets/fonts/jetbrains-mono-variable-latin.woff2` | 40 KB  |
| 图标                         | Material Design Icons（裁剪版；数量以字体资源清单为准） | `apps/web/src/assets/fonts/materialdesignicons-subset.woff2`    | 约 5 KB |
| 中文                         | 系统中文（苹方 / 微软雅黑 / 思源等）   | —                                                      | 0      |

- `@font-face` 在 `apps/web/src/styles/fonts.scss`（文本字体，`font-display: swap` + `unicode-range` 限 latin）
  与 `apps/web/src/styles/mdi.scss`（图标字体，`font-display: block`）。
- 字体族写在 `design/v2/tokens.ts` 的 `--k2-font-sans` / `--k2-font-mono` 栈首，全站只消费这两个变量。
- 文件放 `apps/web/src/assets/`（不是 `public/`）：构建后带内容哈希，浏览器可以长缓存，改字体自动换 URL。
  生产部署给 `/assets/*` 配 `Cache-Control: public, max-age=31536000, immutable` 即可。
- 许可与再生成方法：`apps/web/src/assets/fonts/README.md`（Inter / JetBrains Mono = SIL OFL 1.1，
  图标 = Apache-2.0 / Pictogrammers Free License，许可原文都在同目录）。

## 选型依据（真实构建实测）

三套字体方案在同一套构建上实测对比：

| 方案                                           | 首屏字体请求 | 首屏字体体积 |
| ---------------------------------------------- | ------------ | ------------ |
| Inter + JB Mono（latin）                       | 2            | 87 KB        |
| 再叠 Noto Sans SC 分片（unicode-range 303 片） | 19           | 1024 KB      |
| 再叠中文子集（可变，848 字）                   | 3            | 277 KB       |

- **分片方案每进一个新页面还要再下 ~180 KB**（/channels +3 片、/models +3 片），子集方案去过一次之后零请求。
- `font-display: swap` 实测不阻塞：字体故意晚 2 秒时，文字 119 ms 就出现；`block` 要等 2182 ms。
- 字体与亮暗主题无关：切主题新增字体请求 0。
- 当前最大的字体负载其实是**图标字体**：全量 `@mdi/font` 是 394 KB / 7448 个图标，
  而项目只使用一个裁剪子集 → 裁到 约 5 KB，CSS 也从 408 KB 降到几 KB。

**中文 webfont 目前不引入**（理由见上表：分片要 1 MB，子集也有 277 KB，系统中文零成本）。
将来若确需统一跨平台中文字形，加一份可变子集（当前界面用字 ≈ 190 KB）并把系统中文留在回落链尾部即可。

## 怎么验证

- 单测：`apps/web/src/__tests__/fonts.spec.ts`（字体文件、字体栈、font-display、字号字重档位没动）、
  `apps/web/src/__tests__/mdi-icons.spec.ts`（源码里的图标 + Vuetify 内置图标集逐个对裁剪清单校，漏了会红）。
- 生产构建后看 `dist/assets/`：应有 3 个 `.woff2`（带哈希），没有 394 KB 的图标字体。
- 真机：普通界面是 Inter、代码/日志区是 JetBrains Mono、中文是系统字、图标不空白；切亮暗不产生新的字体请求。

## 加图标怎么办

裁剪清单 = 前端源码里的 `mdi-*` ∪ Vuetify 内置图标集（`vuetify/lib/iconsets/mdi.js`）。
加了新图标要**重跑生成命令**（见 `apps/web/src/assets/fonts/README.md`），否则图标渲染成空白；
忘了重跑时 `mdi-icons.spec.ts` 会直接报出缺哪几个。
