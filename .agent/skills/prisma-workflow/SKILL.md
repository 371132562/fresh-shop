---
name: prisma-workflow
description: 在 fresh-shop 中修改 Prisma schema、seed、数据库落库逻辑和相关共享契约时使用；用于控制 SQLite 风险、同步项与最小必要命令。
---

# Prisma 工作流

## 何时必须用

- 修改 `backend/prisma/schema.prisma`
- 修改 `backend/prisma/prisma.service.ts`、`backend/prisma/prisma.module.ts`
- 新增或调整数据库字段、索引、枚举、关系、默认值
- 新增或调整 seed、图片落库、软删除、统计依赖字段
- 业务逻辑依赖新的数据库结构或 JSON 字段形状

## 当前项目特征

- 数据库使用 SQLite。
- 多数业务模型采用 `delete: 0/1` 软删除约定。
- `GroupBuy.units`、图片数组、全局设置值等字段包含 JSON 结构，改动时要同步评估序列化/反序列化与前后端消费。

## 执行检查单

1. 先确认改动目标是业务字段变化、查询性能、统计口径，还是纯技术性整理；数据库结构破坏性变更必须先与用户确认。
2. 至少查 3 处现有模型或查询实现，确认命名、软删除条件、索引策略与统计口径保持一致。
3. schema 变更后，同步检查以下链路：
   - 相关 service 的 Prisma 查询与事务
   - `backend/types/dto.ts` 中共享契约
   - 前端 Store / 页面 / 表单消费
   - `backend/README.statistics.md` 中是否涉及统计口径调整
4. 涉及 JSON 字段时，明确字段结构、默认值、空值语义与前端消费方式，不要只在一端偷偷改变形状。
5. 涉及软删除、唯一性校验、引用检查时，显式带上 `delete: 0` 等条件。
6. 需要执行 `prisma generate`、`db push`、`seed` 等命令时，若当前环境是 WSL 且项目位于 `/mnt/<盘符>/...`，先参考 `wsl-windows-command-bridge`。
7. 默认只执行最小必要命令，不把 `generate`、`db push`、`seed`、`lint`、`build` 混成一大串。

## 常见同步项

- 新字段是否需要加入列表筛选、详情展示、创建/编辑表单
- 新枚举是否需要加入前端下拉选项与文案映射
- 新索引是否真的对应高频查询条件
- 字段改名后是否遗漏上传模块、统计模块或共享类型的旧引用

## 反模式

- 不要在未确认业务影响前直接做破坏性 schema 调整。
- 不要只改 schema，不同步 service、共享类型与前端消费。
- 不要把 SQLite / 宿主环境问题误判成业务代码问题。
- 不要依赖隐式默认值让 JSON 字段或软删除逻辑“碰巧可用”。
