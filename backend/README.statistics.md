统计分析口径与各接口规则说明

本文档统一约定后台统计相关的“时间/订单/金额/退款/订单量/利润”等口径，并逐接口说明具体聚合逻辑，确保前后端及不同统计页面数据一致。

一、全局统一口径

1) 时间口径（适用于所有 Analysis/Customer 统计接口）
- 过滤字段：按团购单发起时间 `groupBuyStartDate` 过滤。
- 传参规则：当 `startDate` 和 `endDate` 同时提供时启用过滤；否则统计全量历史。

2) 订单口径（参与统计的订单集合）
- 仅统计 `delete = 0` 且 `status ∈ [PAID, COMPLETED, REFUNDED]` 的订单。

3) 销售额（Revenue）
- 退款订单（`REFUNDED`）：销售额 = 0（社区团购“只退款不退货”，退单不产生销售额）。
- 非退款订单（`PAID/COMPLETED`）：销售额 = 原始金额 − 部分退款金额。
  - 原始金额 = `unit.price * quantity`（以下单时选中的规格单价计）。
  - 部分退款金额 = `partialRefundAmount`（订单上记录的累计部分退款额）。

4) 退款金额（TotalRefundAmount）
- 退款订单：退款金额 += 原始金额（全额退款）。
- 非退款订单：退款金额 += 部分退款金额（若为 0 则不计）。

5) 订单量（OrderCount）
- 仅计 `PAID/COMPLETED` 的订单；`REFUNDED` 不计入订单量。

6) 利润（Profit，仅在涉及利润的接口/模块中使用）
- 非退款订单：利润 = 原始利润 − 部分退款金额，原始利润 = `(unit.price − unit.costPrice) * quantity`。
- 退款订单：利润 = − 原始成本，原始成本 = `unit.costPrice * quantity`。

7) 客单价/均单价（AverageOrderAmount）
- 公式：`averageOrderAmount = totalRevenue / orderCount`；当 `orderCount = 0` 时为 0。

8) 其它通用说明
- 聚合与排序均在口径处理后进行。
- 涉及分页的接口统一在聚合完成后再做分页切片。

二、各接口规则明细

1) /analysis/count
- 目标：分析总览（团购/订单的概览与趋势）。
- 时间：按 `groupBuyStartDate` 过滤。
- 订单集：遵循全局订单口径。
- 金额：遵循“销售额/退款金额/利润”统一口径（利润在内部按需计算）。
- 趋势：
  - 每日趋势按“团购发起日”聚合；
  - 长区间累计趋势先分桶再累计。

2) /analysis/mergedGroupBuyOverview（团购单概况，按名称合并）
- 主键：团购名称 + 供货商（合并同名）。
- 统计：`totalRevenue / totalOrderCount / totalRefundAmount …` 依据统一口径。
- 排序/分页：支持按多字段排序与分页。

3) /analysis/mergedGroupBuyOverviewDetail（团购单概况详情）
- 输入：`groupBuyName, supplierId, startDate?, endDate?`。
- 订单集：按时间与口径筛选该“名称+供货商”下的全部团购期次与订单。
- 金额/退款/订单量/利润：完全按统一口径累计；
  - 已退款订单：`revenue = 0`，`profit = -cost`，不计入订单量；
  - 部分退款：直接用绝对额冲减销售额与利润；
- 附加：客户购买次数分布、地域分布、团购发起历史等。

4) /analysis/customerOverview（客户概况）
- 聚合维度：按客户 ID 聚合。
- 统计：
  - 销售额：非退款订单按“原价−部分退款”累计，退款订单为 0；
  - 订单量：仅计 `PAID/COMPLETED`；
  - 退款金额：退款订单加原始金额，非退款订单加部分退款额；
  - 平均单价：`totalRevenue / totalOrderCount`。
- 支持：名称搜索、排序（`totalRevenue/totalOrderCount/averageOrderAmount/totalRefundAmount`）、分页。

5) /analysis/addressOverview（地址/小区概况）
- 聚合维度：按客户地址 ID 聚合（以订单关联的客户的 `customerAddressId` 归属）。
- 统计口径与 customerOverview 完全一致：
  - 销售额/退款金额/订单量/平均单价：与“客户概况”同口径；
- 支持：地址名称搜索、排序、分页。

6) /analysis/supplierOverview（供货商概况）
- 聚合维度：按供货商 ID 聚合。
- 统计：在统一口径基础上额外计算利润相关字段：
  - `totalRevenue / totalProfit / totalOrderCount / totalRefundAmount / uniqueCustomerCount / totalGroupBuyCount / averageProfitMargin` 等；
- 支持：多字段排序、分页、搜索。

7) /analysis/supplierOverviewDetail（供货商概况详情）
- 输入：`supplierId, startDate?, endDate?`。
- 订单集：按时间与口径筛选该供货商全部团购与订单。
- 金额与利润：同统一口径，包含商品/分类/地域等多维统计。

8) /customer/consumptionDetail（客户消费详情）
- 输入：`{ id, startDate?, endDate? }`（客户 ID）。
- 订单量：仅计 `PAID/COMPLETED`；
- 金额：退款订单金额=0；非退款订单金额=原价−部分退款；
- 退款：退款订单加原始金额；非退款订单加部分退款；
- 商品/团购明细：
  - 商品购买次数仅计非退款订单；
  - 团购小计仅计非退款订单金额；
- 15天窗口对比：
  - 窗口A：最近15天（含今日），窗口B：再往前15天；
  - 订单量仅计 `PAID/COMPLETED`，金额按统一口径；
  - 对比基于“全量订单集合”并按窗口划分。

9) /customer/addressConsumptionDetail（地址消费详情）
- 输入：`{ id, startDate?, endDate? }`（地址 ID）。
- 口径与 `/customer/consumptionDetail` 一致；
- 附加：按地址下的客户聚合（`addressCustomerStats`）时：
  - 订单量仅计 `PAID/COMPLETED`；
  - 销售额：非退款订单按“原价−部分退款”；退款订单为 0；
  - 退款金额：退款订单加原始金额；非退款订单加部分退款；
  - 统计每位客户的部分退款单数与全额退款单数。

三、关键公式速记

- 原始金额 OriginalRevenue = `unit.price * quantity`
- 原始成本 OriginalCost    = `unit.costPrice * quantity`
- 非退款订单销售额 Revenue  = `OriginalRevenue - partialRefundAmount`
- 退款订单销售额 Revenue    = `0`
- 非退款订单利润 Profit     = `OriginalProfit - partialRefundAmount`
- 退款订单利润 Profit       = `- OriginalCost`
- 退款金额合计 RefundTotal  = `Σ(Refunded ? OriginalRevenue : partialRefundAmount)`
- 订单量 OrderCount         = `count(status ∈ [PAID, COMPLETED])`
- 平均单价 AvgOrderAmount   = `totalRevenue / orderCount`（分母为 0 时取 0）

四、一致性校验要点（前后端联调关注）

- 确认前端展示的“时间范围”始终通过 `startDate/endDate` 传入上述接口；
- 确认“订单量”在所有列表/详情/图表中均只计 `PAID/COMPLETED`；
- 确认“销售额与退款金额”的口径与上文一致（退款=0 销售额 / 退款金额记原始金额；部分退款按绝对额扣减/累计）；
- 涉及利润的模块（供货商概览/详情）遵循“退款订单利润为负成本”的规则。


