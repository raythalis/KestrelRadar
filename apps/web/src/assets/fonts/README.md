# 字体文件

这个目录里的字体是**提交进仓库**的（构建时不需要联网，也不需要额外的字体工具链）。
三个文件的角色：

| 文件                                  | 体积   | 用途                                      | 许可                                                                 |
| ------------------------------------- | ------ | ----------------------------------------- | -------------------------------------------------------------------- |
| `inter-variable-latin.woff2`          | 48 KB  | 普通界面：英文、数字、符号                | SIL OFL 1.1（`LICENSE-Inter.txt`）                                   |
| `jetbrains-mono-variable-latin.woff2` | 40 KB  | 代码、日志、IP、技术串（`--k-font-mono`） | SIL OFL 1.1（`LICENSE-JetBrainsMono.txt`）                           |
| `materialdesignicons-subset.woff2`    | 5.0 KB | 图标（`@mdi/font` 的裁剪版，92 个图标）   | Apache-2.0 / Pictogrammers Free（`LICENSE-MaterialDesignIcons.txt`） |

两份文本字体都是**可变字体**（一份文件覆盖 400–900 字重），只含 `latin` 字符集；
`@font-face` 写在 `src/styles/fonts.scss`，字体族接在 `src/design/tokens/foundation.ts` 的
`--k-font-sans` / `--k-font-mono` 栈首。**中文不引 webfont**，回落到系统中文（苹方 / 微软雅黑）。

## 为什么是裁剪版图标字体

全量 `@mdi/font` 是 7448 个图标：woff2 394 KB + CSS 408 KB，而项目实际只用到 92 个。
裁剪后字体 5.0 KB、CSS 几 KB。图标清单 = 前端源码里出现的 `mdi-*` ∪ Vuetify 内置 mdi 图标集
（`node_modules/vuetify/lib/iconsets/mdi.js`：选择框箭头、弹窗关闭、复选框、分页这些由 Vuetify 内部渲染，
源码里搜不到名字，不能漏）。

## 怎么重新生成

文本字体（换版本时才需要）：从 Google Fonts 的 CSS 里取 `latin` 那一份 woff2，例如

```bash
curl -A 'Mozilla/5.0 ... Chrome/131' 'https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap'
# 输出里 latin 段（不是 latin-ext）的 url 就是上面那个文件
```

图标字体（**加/改图标后必须重跑**，否则新图标只显示空白）：

```bash
# 需要 python3 + fonttools + brotli：uv pip install fonttools brotli
# UNICODES 从 @mdi/font 的 CSS 里按名字查码位（.mdi-<name>:before{content:"\F0123"}）
python3 -m fontTools.subset node_modules/@mdi/font/fonts/materialdesignicons-webfont.woff2 \
  --unicodes="$UNICODES" --flavor=woff2 --no-hinting --desubroutinize --layout-features= \
  --output-file=src/assets/fonts/materialdesignicons-subset.woff2
```

再用同一份名字生成 `src/styles/mdi.scss` 里的 `.mdi-<name>:before { content: '\\F0123'; }` 规则。
`src/__tests__/mdi-icons.spec.ts` 会拿源码里出现的图标名 + Vuetify 图标集逐个对这份 CSS 校验，漏了会红。
