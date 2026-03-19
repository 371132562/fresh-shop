---
name: create-zustand-store
description: 在 fresh-shop 中创建或修改 Zustand Store 时使用；约束 store 的文件粒度、状态职责、异步 action、loading 管理、列表刷新与共享类型复用方式。
---

# Zustand Store 开发规范

## 目录与命名

- Store 放在 `frontend/src/stores/`
- 文件粒度与业务模块保持一致，通常命名为 `xxxStore.ts`
- 每个文件默认导出一个 `useXxxStore`
- 不要在 store 文件中拆散导出零碎 state 或 action

## Store 职责

Store 负责：

- 页面级业务状态
- 分页、筛选、详情、统计等数据读取
- 创建、更新、删除、状态流转等异步 action
- 提交成功后的列表、详情、统计刷新

Store 不负责：

- JSX 渲染
- 组件布局
- 大量依赖具体 UI 组件的临时展示逻辑

## 类型与请求

- 类型优先复用 `fresh-shop-backend/types/dto.ts` 与 `fresh-shop-backend/types/response.ts`
- 接口常量来自 `frontend/src/services/apis.ts`
- 请求统一走 `frontend/src/services/base.ts`
- 不在 Store 内重复实现请求层已经处理过的通用错误提示

## 状态设计

- 使用 selector 消费 store，避免组件订阅整个 store
- 页面筛选参数可集中在 `pageParams` 一类对象中管理
- 每个异步 action 都要有明确的 loading 状态
- 返回值保持稳定语义，例如成功返回 `true`，失败返回 `false` 或 `null`

## 异步 action 约定

- 使用 `try/catch/finally`
- `finally` 中负责回收 loading，并按业务需要刷新列表、详情或统计
- 多个刷新动作必须有明确顺序，避免出现“列表更新了但详情没更新”的不一致
- 组件外读取状态使用 `useXxxStore.getState()`

## 实现原则

- 只在 Store 中放页面级可复用的业务逻辑，不要把一次性页面临时逻辑过度沉淀进去
- 涉及状态派生、订阅优化、副作用收敛时，继续评估 `vercel-react-best-practices`
- 涉及共享口径的统计数据时，与后端返回结构保持一致，不在前端私自重定义口径
