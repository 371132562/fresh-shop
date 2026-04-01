---
name: create-backend-module
description: 在 fresh-shop 中创建或修改 NestJS 后端业务模块时使用；约束 businessComponent 目录下的 controller、service、module、DTO、Pipe、Prisma 调用和共享类型组织方式。
---

# 后端模块开发规范

## 先查

- `backend/src/businessComponent/supplier/*`
- `backend/src/businessComponent/order/*`
- `backend/src/businessComponent/product/*`
- `backend/src/interceptors/response.interceptor.ts`
- `backend/src/exceptions/businessException.ts`
- `backend/prisma/prisma.service.ts`

## 执行检查单

1. 标准模块结构优先保持 `module / controller / service`，新增复杂入参或复用校验时再补 DTO / Pipe，不继续扩散弱约束写法。
2. controller 只做接参与调用，不手动拼 `{ code, msg, data }`。
3. 业务错误统一走 `BusinessException + ErrorCode`；缺失错误码时补到 `backend/types/response.ts`。
4. service 返回稳定业务字段，不直接把底层数据库异常抛给前端。
5. 数据库访问统一通过 `PrismaService`；Prisma 调用集中在 service。
6. 涉及多表写入、状态联动、批量操作时优先考虑事务。
7. 查询条件、软删除条件、唯一性校验必须显式表达，当前项目默认软删除字段为 `delete: 0/1`。
8. 共享 DTO / 响应类型优先放在 `backend/types/`，前端直接复用 `fresh-shop-backend/types/*`。
9. 涉及统计分析、销售额、退款、利润、订单量等口径时，以 `backend/README.statistics.md` 为准。
10. 复杂业务规则必须有中文注释，说明为什么这样校验、这样筛选、这样排序。
11. 改动共享契约时转 `type-contract-guidelines`；改动 schema/seed 时转 `prisma-workflow`；改动审计留痕时转 `implement-audit-log`。

## 反模式

- 不要把参数校验散落在 controller / service。
- 不要直接抛字符串或临时错误码。
- 不要在前端重新复制一份同名业务类型。
