# Foundation

Kestrel Radar 的 Foundation 是设计系统的基础值与语义角色，不是单独的一套旧主题。当前唯一 token 源是 `apps/web/src/design/v2/tokens.ts`，它定义亮暗颜色、排版、间距、圆角、阴影、密度、布局、图标、动效及主题；组件通过生成的 `--k2-*` 变量与同源 Vuetify 主题消费这些值。

- **Token 层**：定义可复用的基础值与语义角色；不为单个组件的局部尺寸强造全局变量。
- **组件层**：App 组件和业务组件使用 token 表达外观与状态；共享状态只表达一次，危险操作保持独立层级。
- **页面层**：组织数据、用户任务与信息层级；正式页面不能直接照搬组件演示页。规则见[正式页面](product-pages.md)。
- **文字与资源**：文案约束见[界面文案](ux-writing.md)，字体与图标见[字体](fonts.md)。

具体视觉规则与现行布局见[视觉设计](visual-design.md)；数值的实现真相始终在代码里。旧版 Foundation 中指向 `design/tokens/`、`/design` 的内容已过时，不在这里继承。
