## 后端概述

后端位于 `backend/`，核心栈为 NestJS 11、Prisma 6、SQLite。

## 进入后端任务前先选 Skill

完整路由见根 `AGENTS.md`；后端常用 Skill：`create-backend-module`、`type-contract-guidelines`、`prisma-workflow`、`implement-audit-log`、`comment-detail-preservation`。

如果当前环境是 WSL、项目位于 `/mnt/<盘符>/...`，且要执行 `pnpm` / `node` / `prisma` / `nest` / `eslint` / `build` / `seed` / `generate` 等依赖相关命令，先参考根 `AGENTS.md` 中强制 Skill `/wsl-windows-command-bridge`。

## 先看哪里

| 任务 | 位置 | 说明 |
| --- | --- | --- |
| 应用入口与全局装配 | `src/main.ts` `src/app.module.ts` | 全局前缀、拦截器、异常过滤器、模块挂载都从这里出发 |
| 统一响应结构 | `src/interceptors/response.interceptor.ts` `../types/response.ts` | 成功响应统一 `{ code, msg, data }` |
| 全局异常与业务错误 | `src/exceptions/allExceptionsFilter.ts` `src/exceptions/businessException.ts` | 统一异常出口与业务错误约定 |
| Prisma 接入 | `prisma/prisma.service.ts` `prisma/prisma.module.ts` `prisma/schema.prisma` | 所有数据库访问统一从这里走 |
| 业务模块参考 | `src/businessComponent/supplier/*` `src/businessComponent/order/*` `src/businessComponent/product/*` | controller / service / module 的现成模板 |
| 上传链路参考 | `src/upload/*` | 图片上传、文件引用与清理逻辑参考 |
| 统计口径说明 | `README.statistics.md` | 销售额、退款、利润、订单量等口径以此为准 |

## 非协商约束

- 接口统一使用 `POST`，成功响应由统一拦截器包装成 `{ code, msg, data }`；controller 不手动拼响应外壳。
- controller 保持轻量，业务规则、Prisma 查询、事务编排集中在 service。
- 当前项目已有模块中存在直接在 controller 使用 Prisma 输入类型的写法；新增或复杂改动默认优先补齐 DTO / Pipe / 共享类型，而不是继续扩散弱约束写法。
- 数据库访问统一通过 `PrismaService`；修改 schema、seed、落库结构时转 `prisma-workflow`。
- 软删除约定使用 `delete: 0/1`；查询、唯一性校验、引用检查必须显式带上软删除条件，不能依赖隐含默认值。
- 前后端共享契约优先收敛到 `backend/types/dto.ts` 与 `backend/types/response.ts`，不要让前端深层 import 业务模块内部类型。
- 只要本次开发会新增或修改类型定义、函数、方法、DTO、Service/Controller 关键流程，或会新增/修订注释，先参考根 `AGENTS.md` 中强制 Skill `/comment-detail-preservation`。
- 审计日志、关键留痕、敏感查询记录按需加载 `implement-audit-log`，不要把 `console` 或技术日志误当审计链路。
