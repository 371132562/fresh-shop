## 审计日志字段清单

以下字段是 fresh-shop 中设计审计日志时的推荐最小集合，可按业务模块扩展，但不要随意删减核心追责字段。

### 核心标识

- `module`：业务模块名，例如 `order`、`customer`、`groupBuy`
- `action`：业务动作，优先使用稳定枚举值
- `targetType`：目标对象类型
- `targetId`：目标对象主键
- `batchId`：批量操作时的批次标识

### 操作者

- `operatorId`
- `operatorName`
- `operatorType`：例如 `admin`、`system`

### 结果

- `result`：`SUCCESS` / `FAILED`
- `errorCode`
- `errorMessage`

### 业务摘要

- `summary`：一句话摘要，便于列表检索
- `before`：变更前关键字段
- `after`：变更后关键字段
- `meta`：补充上下文，例如筛选条件、来源页面、结果条数、批量统计

### 时间与追踪

- `createdAt`
- `requestId`

## action 命名建议

优先使用业务可读、可检索的动作名，不要一律收敛成 `update`：

- `create`
- `update`
- `delete`
- `pay`
- `complete`
- `refund`
- `partial-refund`
- `export`
- `view-detail`
- `query-stats`

## before / after 建议

只保留能解释业务变化的关键字段，例如：

- 订单状态
- 数量
- 金额
- 退款金额
- 关联客户或团购单
- 描述类字段

不要直接保存整份数据库记录或整份请求体。

## 查询类操作建议

查询类日志优先记录：

- 查询入口
- 归一化后的筛选条件
- 查询结果数量
- 是否包含敏感或关键数据

不要记录普通页面自动刷新带来的重复查询噪声。
