# packages/contracts（待落地）

前后端共享的类型与校验契约：一处定义（Zod）→ 后端用它做请求校验与 OpenAPI 生成 →
前端直接引用同一套类型，字段改名时在编译期就能发现。

现在还没有内容：后端的第一个阶段（见 `apps/api/README.md`）会把它建起来。
在那之前，前端用自己的 `apps/web/src/types/domain.ts`，落地时以本包为唯一来源。
