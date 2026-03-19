## 项目概述

fresh-shop 是一个基于 pnpm workspace 的前后端一体仓库：

- 前端：`frontend/`（React 18 + TypeScript + Vite + React Router + Zustand + Ant Design + Tailwind CSS）
- 后端：`backend/`（NestJS + Prisma）

## 第一性原理

请使用第一性原理思考。不要默认我已经把目标、边界和实现路径想清楚了。遇到以下情况时，先停下来澄清，再继续执行：

- 需求目标和业务动机不清晰
- 方案存在多种方向且会影响业务口径
- 操作具有明显破坏性或不可逆

若目标明确、边界清晰、风险可控，则直接落地，不要把简单任务强行变成长流程审批。

## Skills 体系

本项目的本地 Skills 位于 `.agent/skills/`。使用原则如下：

1. 先判断是否命中“必须调用”的本地 Skill。
2. 若是较大改动或新功能，先走 `/project-workflow`，再进入具体领域 Skill。
3. React 相关任务再按触发条件评估 `vercel-react-best-practices` 与 `vercel-composition-patterns`。
4. 只有在需要检查或修复规范问题时才使用 `/eslint-fix`。

### 必须调用的本地 Skills

| 场景 | 必须调用的 Skill | 说明 |
| --- | --- | --- |
| 开发新功能、实现需求、较大改动 | `/project-workflow` | 用于澄清边界、查找相似实现、拆解改动与验证路径 |
| 创建/修改 React 组件、页面、UI 元素 | `/create-ui-component` | 仅处理视图、交互、页面结构与样式约束 |
| 创建/修改 Zustand Store 或状态管理 | `/create-zustand-store` | 处理状态、数据流、异步 action 与页面联动 |
| 创建/修改后端业务模块 | `/create-backend-module` | 处理 controller/service/module/DTO/Pipe/共享类型约束 |
| 实现日志上报、审计日志功能 | `/implement-audit-log` | 处理可追责操作日志、字段约定、写入时机与边界 |
| ESLint 检查、TypeScript 检查、修复代码规范问题 | `/eslint-fix` | 按改动范围做定向 lint/typecheck，不默认全量扫描 |

### React 最佳实践 Skills

#### `vercel-react-best-practices`

涉及 React 组件、页面、Hook 的新增、重构、代码评审、性能排查时，必须先评估是否使用该 Skill。

以下任一场景命中时必须使用：

- 副作用设计
- 状态派生
- 事件监听
- 高频交互
- 列表渲染
- 请求并发、去重、竞态处理
- 懒加载
- 包体积优化
- 重渲染优化

#### `vercel-composition-patterns`

仅在以下场景必须使用：

- 组件存在多个 boolean props
- 存在 render props 或 `renderX` 接口
- 设计 compound components
- 设计 context provider 接口
- 设计可复用基础组件
- 需要将状态与 UI 解耦
- 多业务变体复用同一组件导致条件分支复杂

普通业务页面字段增删、样式微调、简单交互修复，不要求使用该 Skill。

### React 18 约束

项目 React 版本为 `18.x`。执行外部 React Skills 时必须遵循：

- 跳过 `vercel-composition-patterns` 中全部 `react19-*` 规则
- 跳过所有依赖 React 19 新 API 的建议与示例，例如 `use()`、`ref` 作为普通 prop、`<Context value={...}>`
- 若 `vercel-composition-patterns` 的非 `react19-*` 规则示例仍出现 React 19 写法，必须先改写为 React 18 等价实现后方可采用
- `vercel-react-best-practices` 中 Next.js / Server Action / RSC / `server-*` / `React.cache()` / `next/dynamic` 等专属规则，仅在对应技术栈存在时才可采用
- `vercel-react-best-practices` 中涉及 React 新 API 的建议，仅在当前项目版本支持时才可采用，否则必须跳过或改写为 React 18 等价方案

## 项目架构

### 仓库结构

```text
fresh-shop/
├── frontend/
│   ├── src/
│   │   ├── pages/             # 页面，按业务模块组织
│   │   ├── components/        # 复用 UI 组件
│   │   ├── stores/            # Zustand 状态管理
│   │   ├── services/          # API 常量与请求封装
│   │   ├── utils/             # 公共工具方法
│   │   ├── router.tsx         # 路由配置
│   │   └── main.tsx           # 应用入口
│   └── .env
├── backend/
│   ├── src/
│   │   ├── businessComponent/ # 业务模块
│   │   ├── interceptors/      # 响应拦截器
│   │   ├── exceptions/        # 全局异常过滤器与业务异常
│   │   ├── upload/            # 上传相关能力
│   │   └── main.ts            # 后端入口，全局前缀 /fresh
│   ├── prisma/
│   ├── types/                 # 前后端共享 DTO / Response 类型
│   └── README.statistics.md   # 统计口径说明
└── .agent/skills/             # 项目本地 Skills
```

### 分层约定

- 页面与组件只负责展示、交互和少量本地 UI 状态。
- Zustand Store 承载页面级业务状态、列表查询、详情读取和异步提交逻辑。
- 请求封装与接口常量位于 `frontend/src/services/`。
- 后端 controller 保持轻量，业务规则集中在 service，DTO/Pipe 负责入参与业务前置校验。
- 前后端共享类型优先放在 `backend/types/`，避免重复定义。

## 方案规范

当需要给出修改或重构方案时，必须遵循以下约束：

- 不给兼容性补丁式方案
- 不做过度设计，保持最短路径实现
- 不擅自扩展到用户需求之外的业务方案
- 方案必须经过完整链路验证，确保逻辑闭环

## 注释规范

- 必须补充面向接手开发者的注释，重点说明业务意图、边界条件、异常分支和关键取舍
- 建议使用简短 JSDoc 头部注释；复杂逻辑内部可分段注释
- 修改逻辑时必须同步修订旧注释，避免注释与实现脱节
- 除非用户明确要求删除注释，否则不要因为审查提示而删除现有注释

## 文档与 Skill 资源规范

- 除非用户明确要求，不要额外生成项目文档；允许修订已有文档
- Agent 产生的临时文件、中间产物、缓存、草稿、日志必须放在 `.agent/` 目录下
- Skill 的补充资源优先放在各自目录内的 `references/` 或 `scripts/`，不要散落到仓库其他位置

## 验证规范

- 禁止默认执行 `dev`、`build`、`install` 类任务，除非用户明确要求
- Lint 与 TypeScript 检查按改动范围执行，不默认全量运行
- 仅文案、注释、纯文档类修改时，通常不需要额外 lint/typecheck

## Git 规范

- 不自动提交，除非用户明确要求
- 不撤销、不覆盖、不清理用户已有改动，除非用户明确要求

## 禁止操作

以下操作在未确认前禁止执行：

- Git 撤销、覆盖、重置、清理等可能导致代码丢失的操作
- 删除核心配置文件
- 大范围重构
- 数据库结构破坏性变更
