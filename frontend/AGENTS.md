## 前端概述

前端位于 `frontend/`，核心栈为 React 18、TypeScript、Vite 6、React Router 7、Zustand 5、Ant Design 6、Tailwind CSS 4。

## 进入前端任务前先选 Skill

完整路由见根 `AGENTS.md`；前端常用 Skill：`create-ui-component`、`create-zustand-store`、`type-contract-guidelines`、`comment-detail-preservation`、`ant-design-docs`。

如果当前环境是 WSL、项目位于 `/mnt/<盘符>/...`，且要执行 `pnpm` / `vite` / `eslint` / `tsc` / `build` 等依赖相关命令，先参考根 `AGENTS.md` 中强制 Skill `/wsl-windows-command-bridge`。

## 先看哪里

| 任务 | 位置 | 说明 |
| --- | --- | --- |
| 路由入口 | `src/router.tsx` | 路由跳转、懒加载页面、详情页入口都从这里出发 |
| 请求常量与统一请求封装 | `src/services/apis.ts` `src/services/base.ts` | 不要跳过这层直接 `fetch` |
| 列表页与表单页参考 | `src/pages/Supplier/index.tsx` `src/pages/Product/index.tsx` `src/pages/Order/index.tsx` | 搜索、排序、分页、列表操作的现有模式 |
| 详情/编辑页参考 | `src/pages/GroupBuy/Detail.tsx` `src/pages/Order/Detail.tsx` `src/pages/Supplier/Modify.tsx` | 详情展示与弹层编辑入口参考 |
| 通用组件参考 | `src/components/SearchToolbar/index.tsx` `src/components/Layout/index.tsx` `src/components/StatisticsGuideModal/index.tsx` | 工具栏、整体布局、统计说明类组件 |
| Store 参考 | `src/stores/supplierStore.ts` `src/stores/orderStore.ts` `src/stores/groupBuyStore.ts` | 列表查询、详情读取、提交后刷新等模式参考 |

## 非协商约束

- 请求统一走 `src/services/base.ts`，接口地址统一收敛到 `src/services/apis.ts`。
- 页面与组件只负责展示、交互编排和少量本地 UI 状态；业务状态、列表查询、异步提交放 `stores/`。
- 修改页面入口、详情页路径或导航承载关系时，同步检查 `src/router.tsx` 的懒加载与跳转路径。
- 前后端共享类型优先从 `fresh-shop-backend/types/dto.ts` 与 `fresh-shop-backend/types/response.ts` 导入，不在前端重复抄一份业务字段。
- 常规列表页优先复用当前项目已有模式：顶部 `Card + Form + SearchToolbar`，主体用 `List` 或现有容器承载分页与操作按钮。
- Ant Design 组件使用优先级高于自行造轮子；布局与细节微调优先用 Tailwind CSS。
- 编辑类 `Modal` 默认设置 `maskClosable={false}`；纯展示类弹窗按交互需要决定。
- 只要本次开发会新增或修改类型定义、函数、方法、Store state/action，或会新增/修订注释，先参考根 `AGENTS.md` 中强制 Skill `/comment-detail-preservation`。
- 涉及副作用设计、并发、列表渲染、高频交互或重渲染优化时，按根 `AGENTS.md` 评估 `vercel-react-best-practices`；涉及复合组件或状态/UI 解耦时再评估 `vercel-composition-patterns`。
