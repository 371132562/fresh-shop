---
name: create-zustand-store
description: 在 fresh-shop 中创建或修改 Zustand Store 时使用；约束状态粒度、异步 action、列表刷新、共享类型复用与组件订阅方式。
---

# Zustand Store 规范

## 参考实现

- `frontend/src/stores/supplierStore.ts`
- `frontend/src/stores/orderStore.ts`
- `frontend/src/stores/groupBuyStore.ts`
- `frontend/src/stores/analysisStore.ts`

## 目录与命名

- Store 放在 `frontend/src/stores/`
- 文件粒度与业务模块保持一致，通常命名为 `xxxStore.ts`
- 每个文件默认导出一个 `useXxxStore`
- 不要在 store 文件中拆散导出零碎 state 或 action

## 执行检查单

1. Store 负责页面级业务状态、分页筛选、详情读取、异步提交与提交后的刷新闭环。
2. JSX 渲染、布局结构、强依赖具体 UI 组件的临时展示逻辑不要沉到 Store。
3. 类型优先复用 `fresh-shop-backend/types/dto.ts` 与 `fresh-shop-backend/types/response.ts`。
4. 请求统一走 `frontend/src/services/apis.ts` + `frontend/src/services/base.ts`。
5. 查询参数优先收敛成 `pageParams` 一类对象，避免页面散落多个分页/筛选 state。
6. 列表统计信息优先采用当前项目已有模式：`list + listCount + pageParams + listLoading`。
7. 异步 action 统一使用 `try / catch / finally` 管理 loading。
8. 需要向视图层返回结果时，优先返回 `Promise<boolean>` 或稳定对象，不要每个 action 各自漂移。
9. 提交成功后刷新列表、详情或统计时，明确刷新顺序，避免“列表更新了但详情没更新”的不一致。
10. 组件内按 selector 订阅，组件外使用 `useXxxStore.getState()`。
11. 不在 Store 内重复实现请求层已经处理过的通用错误提示。
12. 涉及状态派生、订阅优化、副作用收敛时，继续评估 `vercel-react-best-practices`。

## 反模式

- 不要在页面里复制同一套 loading / list / pagination 状态。
- 不要跳过 store 在多个组件里重复写请求逻辑。
- 不要一次性订阅整个 store。
