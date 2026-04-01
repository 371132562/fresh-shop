---
name: type-contract-guidelines
description: 在 fresh-shop 中创建或修改 DTO、共享 type、backend/types 导出与前后端类型契约时使用，统一放置边界、命名与共享出口。
---

# 类型契约规范

## 何时用

- 创建或修改模块内请求/响应类型
- 调整 `backend/types/dto.ts` / `backend/types/response.ts`
- 调整前后端共享 DTO / response / 枚举
- 判断某个类型应放业务模块内、共享出口，还是前端本地视图层

## 目录结构风格

### 后端模块内类型

- 每个业务模块优先在自己的目录下维护请求 DTO、局部响应 type、局部枚举与轻量复用类型。
- 当前项目历史代码中已有直接复用 Prisma 类型的情况；新增复杂入参与稳定响应时，优先显式定义 DTO / type，而不是继续把 Prisma model 当接口契约。

### 后端共享出口

- 跨前后端复用的稳定契约统一从以下出口暴露：
  - `backend/types/dto.ts`
  - `backend/types/response.ts`
- `backend/types/dto.ts` 负责 re-export 前端真正需要消费的 DTO / type。
- `backend/types/response.ts` 负责 `ErrorCode`、`ResponseBody` 等统一响应协议。
- 不要把仅后端内部使用的中间 type、Prisma 查询辅助结构、上下文对象默认暴露到共享出口。

### 前端本地类型

- 前端共享契约统一从 `fresh-shop-backend/types/dto.ts` 与 `fresh-shop-backend/types/response.ts` 导入。
- 仅当前端专用的视图层结构放在前端本地，例如页面内临时表单态、拖拽态、选项映射结构。
- 前端本地 type 负责 UI 适配，不要复制后端已稳定导出的业务字段。

## 命名规则

1. 请求入参优先使用 `ReqDto` 结尾；如果当前模块保持了现有 `PageParams`、`ListItem` 等命名，也应沿用同一模块既有风格，不强行另起体系。
2. 稳定响应结构优先使用 `ResDto`、`Result`、`ListItem` 等能表达语义的名称。
3. 请求优先用 class 或显式 type；不要让 Prisma model 直接承担全部接口入参语义。

## 放置判断

1. 只在单模块内使用：放业务模块内。
2. 前后端都要消费：模块内定义后，再导出到 `backend/types/dto.ts`。
3. 只在前端渲染层使用：放前端页面附近或 `src/types/`。
4. 只服务后端内部实现：留在模块内，不导出到共享层。

## 执行检查单

1. 先判断这是模块内类型、共享契约，还是前端视图 type。
2. 新增共享契约时，先在最靠近业务的地方定义，再评估是否导出到 `backend/types/dto.ts`。
3. 修改共享契约后，同步检查前端导入点与 Store / 页面 / 组件消费。
4. 请求 DTO 负责字段形状、基础转换、字段级校验；业务合法性仍交给 Pipe 或 service。
5. 不要让前端深层 import 后端业务模块内部文件。

## 反模式

- 不要把 Prisma model 直接当共享 DTO。
- 不要把仅后端内部 type 暴露到 `backend/types/dto.ts`。
- 不要在前端重复声明后端已导出的业务字段。
- 不要把 DTO 目录结构拆成与现有项目风格冲突的新体系。
