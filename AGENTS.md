## 项目概述

fresh-shop 是一个基于 `pnpm workspace` 的前后端一体仓库：

- 前端：`frontend/`（React 18 + TypeScript + Vite + React Router 7 + Zustand + Ant Design 6 + Tailwind CSS 4）
- 后端：`backend/`（NestJS 11 + Prisma 6 + SQLite）

- 所有输出、注释、交互文案统一使用中文。
- 本仓库采用“根 `AGENTS.md` + 子目录 `AGENTS.md` + `.agent/skills/*/SKILL.md`”的分层方式组织 Agent 规范。
- 临时文件、草稿、日志等中间产物放在 `.agent/`，不要放进业务目录或 Skill 目录。

## 先看哪里

| 任务类型 | 先读文件 |
| --- | --- |
| 整体约定、任务路由、何时调用 Skill | `./AGENTS.md` |
| 前端页面、组件、路由、Store、请求 | `./frontend/AGENTS.md` |
| 后端模块、Prisma、共享类型、异常、上传 | `./backend/AGENTS.md` |
| 需求分析、规划、验收流程 | `./.agent/skills/project-workflow/SKILL.md` |

## 第一性原理

请使用第一性原理思考。不要默认我已经把目标、边界和实现路径想清楚了。遇到以下情况时，先停下来澄清，再继续执行：

- 需求目标和业务动机不清晰
- 方案存在多种方向且会影响业务口径
- 操作具有明显破坏性或不可逆

若目标明确、边界清晰、风险可控，则直接落地，不要把简单任务强行变成长流程审批。

## 强制使用的 Skills

以下场景必须先调用对应 Skill，再进入实现：

| 场景 | 必须调用的 Skill | 说明 |
| --- | --- | --- |
| 新功能开发、跨模块改动、较大改动、需要先做验收契约与 TODO 拆解 | `/project-workflow` | 用于澄清目标、边界、相似实现、执行计划与验证路径 |
| 创建/修改 React 组件、页面、布局、样式、路由承载页面 | `/create-ui-component` | 处理视图、交互、页面结构与样式约束 |
| 创建/修改 Zustand Store 或页面级状态管理 | `/create-zustand-store` | 处理状态、数据流、异步 action 与页面联动 |
| 创建/修改后端业务模块 | `/create-backend-module` | 处理 controller/service/module/DTO/Pipe/Prisma/共享类型约束 |
| 创建/修改 DTO、共享 type、`backend/types/*` 导出与前后端契约 | `/type-contract-guidelines` | 处理类型放置边界、导出方式与命名 |
| 修改 Prisma schema、seed、生成客户端、涉及数据库落库逻辑 | `/prisma-workflow` | 处理 schema 变更、SQLite 风险、同步项与最小必要命令 |
| 实现日志上报、审计日志、关键操作留痕 | `/implement-audit-log` | 处理可追责操作日志、字段约定、写入时机与边界 |
| 任意开发任务中会新增/修改类型定义、函数、方法、复杂 state/action，或会新增/修订注释 | `/comment-detail-preservation` | 约束注释详细程度与维护信息保留 |
| ESLint 检查、TypeScript 检查、修复代码规范问题 | `/eslint-fix` | 按改动范围做定向 lint/typecheck，不默认全量扫描 |
| 当前环境是 WSL，项目位于 `/mnt/<盘符>/...`，且要执行 `pnpm` / `node` / `prisma` / `tsc` / `eslint` / `build` / `seed` 等依赖相关命令 | `/wsl-windows-command-bridge` | 避免宿主环境不一致导致原生依赖或 SQLite 问题 |

## 可选但推荐的 Skills

| 场景 | 推荐 Skill |
| --- | --- |
| 需要确认 Ant Design 组件 API、示例、交互模式或让 Agent 按官方组件文档回答 | `/ant-design-docs` |

## React 最佳实践 Skills

### `vercel-react-best-practices`

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

### `vercel-composition-patterns`

仅在以下场景必须使用：

- 组件存在多个 boolean props
- 存在 render props 或 `renderX` 接口
- 设计 compound components
- 设计 context provider 接口
- 设计可复用基础组件
- 需要将状态与 UI 解耦
- 多业务变体复用同一组件导致条件分支复杂

普通业务页面字段增删、样式微调、简单交互修复，不要求使用该 Skill。

## React 18 约束

项目 React 版本为 `18.x`。执行外部 React Skills 时必须遵循：

- 跳过 `vercel-composition-patterns` 中全部 `react19-*` 规则
- 跳过所有依赖 React 19 新 API 的建议与示例，例如 `use()`、`ref` 作为普通 prop、`<Context value={...}>`
- 若 `vercel-composition-patterns` 的非 `react19-*` 规则示例仍出现 React 19 写法，必须先改写为 React 18 等价实现后方可采用
- `vercel-react-best-practices` 中 Next.js / Server Action / RSC / `server-*` / `React.cache()` / `next/dynamic` 等专属规则，仅在对应技术栈存在时才可采用
- `vercel-react-best-practices` 中涉及 React 新 API 的建议，仅在当前项目版本支持时才可采用，否则必须跳过或改写为 React 18 等价方案

## 项目架构

```text
fresh-shop/
├── frontend/                 # 前端应用，细则见 frontend/AGENTS.md
├── backend/                  # 后端服务，细则见 backend/AGENTS.md
├── .agent/                   # 临时产物目录（中间文件、草稿、日志）
├── .agent/skills/            # 项目级 Skills
├── AGENTS.md                 # 根规范与路由入口
└── pnpm-workspace.yaml       # workspace 定义
```

## 全局原则

### 通用开发要求

- 开发前至少查找 3 个项目内相似实现，优先沿用现有命名、分层、错误处理与注释风格。
- 页面与组件只负责展示、交互和少量本地 UI 状态；页面级业务状态放入 Zustand Store。
- 请求封装与接口常量位于 `frontend/src/services/`，不要跳过 `services/base.ts` 自造请求协议。
- 后端 controller 保持轻量，业务规则集中在 service；共享类型优先收敛到 `backend/types/`。
- 涉及统计分析、销售额、退款、利润、订单量等口径时，以 `backend/README.statistics.md` 为准。
- 注释必须帮助后续维护者理解“为什么这样做”；修订旧注释时优先保留其中有效细节，不把详细说明机械压缩成更短版本。
- 非用户明确要求时，不自动提交代码，不新增无必要文档。
- 破坏性变更必须先确认：删除核心配置、修改数据库结构、大范围重构、不可逆 git 操作。

### 跨环境命令执行

- 如果当前运行环境是 WSL，且项目位于 Windows 文件系统（如 `/mnt/c/*`、`/mnt/d/*`），执行 `pnpm` / `node` / `prisma` / `nest` / `vite` / `tsc` / `eslint` / `build` / `seed` / `generate` 等依赖相关命令前，必须先参考 `/wsl-windows-command-bridge`。
- 这类场景默认优先通过 `powershell.exe -NoProfile -Command` 在 Windows 侧执行命令，避免依赖安装宿主与脚本执行宿主不一致。
- 如果当前本身就是原生 Linux 宿主机，则按正常方式执行，无需走 PowerShell。

### 文档与目录边界

- `AGENTS.md` 负责长期稳定的项目规则。
- `.agent/skills/*/SKILL.md` 负责可重复执行的任务规范。
- 子目录 `AGENTS.md` 只写该目录独有的规则，不重复根规则全文。

## 验证规范

- 禁止默认执行 `dev`、`build`、`install` 类任务，除非用户明确要求，或该命令是完成当前任务不可缺少的一步。
- Lint 与 TypeScript 检查按改动范围执行，不默认全量运行。
- 仅文案、注释、纯文档类修改时，通常不需要额外 lint/typecheck。
- Prisma / 数据库结构相关任务属于例外：当修改了 `schema.prisma`、seed 或 Prisma Client 依赖时，可按最小必要范围执行 `generate / migrate / db push / seed` 等命令，但必须先确认执行目的、影响范围与回滚风险。

## Git 规范

- 不自动提交，除非用户明确要求。
- 不撤销、不覆盖、不清理用户已有改动，除非用户明确要求。

## 禁止操作

- 禁止默认执行 `install / dev / start / preview / build` 类命令。
- 禁止默认启动长时间驻留任务或无明确收敛条件的本地服务。
- 禁止跳过 `frontend/src/services/base.ts` 或后端统一响应约定，直接自造请求/响应协议。
- 禁止用 `any` 作为常规开发逃生口；需要共享类型时优先复用 `backend/types/*`。
- 禁止因为检查报错就删除注释、关闭校验、绕开 DTO / Pipe / BusinessException。
- 禁止 Git 撤销、覆盖、重置、清理等可能导致代码丢失的操作。
- 禁止删除核心配置文件。
- 禁止未确认的大范围重构。
- 禁止未确认的数据库结构破坏性变更。
