# 设计规范

Kestrel Radar 正式页面的有效视觉与交互规则在这里；产品怎么使用见[使用手册](../usage.md)。组件演示页 `/style-lab` 仅在开发环境可用，不是正式页面的信息架构。

- [Foundation](foundation.md)：当前 token 的职责与设计层次。
- [视觉设计](visual-design.md)：现行色彩、排版、间距、布局、主题与组件用法。
- [正式页面](product-pages.md)：页面任务、信息层级与组件演示的边界。
- [界面文案](ux-writing.md)：自解释、状态与错误文案。
- [字体](fonts.md)：字体栈、字形资源及维护。

视觉数值以 `apps/web/src/design/v2/tokens.ts` 为唯一实现来源；样式消费层为 `apps/web/src/styles/v2.scss`。旧阶段的设计过程记录保留在本地 `.ai/records/`，不作为公开规范。
