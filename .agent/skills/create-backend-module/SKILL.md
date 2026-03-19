---
name: create-backend-module
description: 在 fresh-shop 中创建或修改 NestJS 后端业务模块时使用；约束 businessComponent 目录下的 controller、service、module、DTO、Pipe、Prisma 调用和共享类型组织方式。
---

# 后端模块开发规范

## 适用范围

本 Skill 适用于以下改动：

- 新增或修改 `backend/src/businessComponent/*` 业务模块
- 调整 controller、service、module、DTO、Pipe
- 调整 Prisma 查询、事务和共享响应结构

## 目录与职责

- 业务模块位于 `backend/src/businessComponent/<domain>/`
- controller 负责接参与调用，不堆复杂业务判断
- service 负责核心业务规则、数据库读写与事务编排
- DTO 负责结构校验与类型约束
- Pipe 负责可复用的业务前置校验

## 接口与错误处理

- 接口统一保持现有项目风格，使用 POST 方法
- 业务错误优先使用 `BusinessException` 搭配 `ErrorCode`
- 若现有错误码不满足需求，在 `backend/types/response.ts` 中补充
- 不要直接向前端暴露底层数据库错误

## 类型与共享约定

- 共享 DTO / 响应类型优先放在 `backend/types/`
- 前端消费共享类型时，直接复用 `fresh-shop-backend/types/*`
- 不要在前端重新复制一份同名业务类型

## Prisma 与事务

- Prisma 调用集中在 service
- 涉及多表写入、状态联动、批量操作时优先考虑事务
- 查询条件、统计口径、软删除条件必须显式表达，不要依赖隐含默认值

## 统计与口径

涉及统计分析、销售额、退款、利润、订单量等口径时：

- 以 `backend/README.statistics.md` 为准
- 前后端口径必须一致
- 不允许在接口层和页面层各自发明一套解释

## 注释要求

- 复杂业务规则必须有中文注释
- 需要说明为什么这样校验、为什么这样筛选，而不只是代码表面含义

## 关联 Skill

- 若改动包含审计日志，继续使用 `/implement-audit-log`
- 若改动影响前端共享状态或页面数据流，继续使用 `/create-zustand-store`
