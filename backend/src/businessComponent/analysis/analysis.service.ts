// src/analysis/analysis.service.ts
import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs'; // 导入 dayjs
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // 导入 isSameOrBefore 插件
import { OrderStatus } from '@prisma/client';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore); // 扩展 isSameOrBefore 插件

import { PrismaService } from '../../../prisma/prisma.service';
import {
  AnalysisCountParams,
  AnalysisCountResult,
  GroupBuyUnit,
  CustomerRankResult,
  MergedGroupBuyOverviewParams,
  MergedGroupBuyOverviewResult,
  MergedGroupBuyOverviewDetail,
  MergedGroupBuyOverviewDetailParams,
  CustomerPurchaseFrequency,
  RegionalSalesItem,
  MergedGroupBuyFrequencyCustomersParams,
  MergedGroupBuyFrequencyCustomersResult,
  MergedGroupBuyRegionalCustomersParams,
  MergedGroupBuyRegionalCustomersResult,
  CustomerBasicInfo,
  GroupBuyLaunchHistory,
  SupplierOverviewParams,
  SupplierOverviewResult,
  SupplierOverviewListItem,
  SupplierOverviewDetailParams,
  SupplierOverviewDetail,
  TopProductItem,
  ProductCategoryStat,
  SupplierFrequencyCustomersParams,
  SupplierFrequencyCustomersResult,
  SupplierRegionalCustomersParams,
  SupplierRegionalCustomersResult,
} from '../../../types/dto'; // 导入类型

/**
 * @interface SelectedOrder
 * @description 订单中需要查询的字段类型定义
 */
interface SelectedOrder {
  quantity: number;
  unitId: string;
  partialRefundAmount: number;
}

@Injectable()
export class AnalysisService {
  constructor(private prisma: PrismaService) {}

  /**
   * @method count
   * @description 统计分析主入口（团购与订单的概览与趋势）
   * 口径说明（务必与前端展示一致）：
   * 1) 时间口径：按"团购发起时间 groupBuyStartDate"筛选团购单，若未传入起止日期，则统计全量历史。
   * 2) 订单口径：仅统计 delete=0 且状态属于 [PAID, COMPLETED, REFUNDED] 的订单。
   * 3) 金额口径：
   *    - 全额退款订单：销售额=0；利润=-成本（将损益体现为负利润）。
   *    - 部分退款订单：销售额与利润均减去退款金额（视为减少收入与收益）。
   * 4) 趋势口径：
   *    - 每日趋势按"团购发起日"聚合；
   *    - 累计趋势在每日基础上进行"动态分桶聚合后再累计"，用于长区间展示。
   * @param {AnalysisCountParams} data - 查询参数（startDate/endDate 可选）。
   * @returns {Promise<AnalysisCountResult>} 统计汇总与趋势序列（保持既有返回结构）。
   */
  async count(data: AnalysisCountParams): Promise<AnalysisCountResult> {
    // ================================================================
    // 金额精度策略（所有金额相关字段统一两位小数）
    // 目的：避免 JS 浮点误差在"逐日累计/分桶聚合/最终汇总"过程中被放大
    // 做法：在关键节点（订单级、日级、总级）均调用 round2 进行规整
    // 备注：若后续接入分单位或大数库，可替换此实现，但当前保持轻量
    // ================================================================
    const round2 = (value: number): number =>
      Math.round((value + Number.EPSILON) * 100) / 100;
    const { startDate, endDate } = data;

    // ================================================================
    // 步骤一：团购总量（按团购发起时间过滤）
    // - 仅统计 delete=0 的团购
    // - 若未传入时间，则统计全量
    // - 用途：用于概览模块的"团购数"
    // ================================================================
    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        ...(startDate && endDate
          ? {
              groupBuyStartDate: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
        delete: 0, // 仅统计未被逻辑删除的团购单
      },
    });

    // ================================================================
    // 步骤二：取团购+订单明细（后续所有统计与趋势的源数据）
    // - 团购过滤：按 groupBuyStartDate 与 delete=0
    // - 订单过滤：delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]
    // - 选择字段：仅保留计算所需字段（数量/规格ID/部分退款/状态）以减少内存与耦合
    // ================================================================
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        ...(startDate && endDate
          ? {
              groupBuyStartDate: {
                gte: startDate,
                lte: endDate,
              },
            }
          : {}),
        delete: 0,
      },
      include: {
        order: {
          where: {
            status: {
              in: [
                OrderStatus.PAID,
                OrderStatus.COMPLETED,
                OrderStatus.REFUNDED,
              ],
            },
            delete: 0, // 仅统计未逻辑删除的订单
          },
          select: {
            quantity: true,
            unitId: true,
            partialRefundAmount: true, // 添加部分退款金额字段
            status: true,
          },
        },
      },
    });

    // ------------------------------------------------
    // 运行中累加器（全局汇总口径）
    // - orderCount：订单总数
    // - totalPrice：销售额合计（两位小数）
    // - totalProfit：利润合计（两位小数）
    // ------------------------------------------------
    let orderCount = 0; // 发起的订单总数（注：关联团购单在指定日期内发起）
    let totalPrice = 0; // 总销售额（两位小数）
    let totalProfit = 0; // 总利润（两位小数）

    // ------------------------------------------------
    // 每日趋势原始映射（key=YYYY-MM-DD）
    // - groupBuyTrendMap：当日发起的团购数
    // - orderTrendMap：当日归属的订单数（按团购发起日归属）
    // - priceTrendMap：当日销售额
    // - profitTrendMap：当日利润
    // ------------------------------------------------
    const groupBuyTrendMap = new Map<string, number>();
    const orderTrendMap = new Map<string, number>();
    const priceTrendMap = new Map<string, number>();
    const profitTrendMap = new Map<string, number>();

    // ------------------------------------------------
    // 明细遍历与口径处理
    // - 团购：用于计数与确定"当日日期"
    // - 订单：按状态与退款口径计算销售额与利润；同时计入当日趋势
    // ------------------------------------------------
    for (const groupBuy of groupBuysWithOrders) {
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 当日团购数 +1（按团购发起日归档）
      const groupBuyDate = dayjs(groupBuy.groupBuyStartDate).format(
        'YYYY-MM-DD',
      );
      groupBuyTrendMap.set(
        groupBuyDate,
        (groupBuyTrendMap.get(groupBuyDate) || 0) + 1,
      );

      // 同日下订单处理：
      // - 订单计数 +1
      // - 订单趋势 +1（按团购发起日归档）
      // - 依据规格计算收入/利润，并更新当日销售额/利润
      for (const order of groupBuy.order as (SelectedOrder & {
        partialRefundAmount: number;
        status: OrderStatus;
      })[]) {
        orderCount++; // 每找到一个订单就计数

        // 订单趋势（按团购发起日归属）
        const orderDate = dayjs(groupBuy.groupBuyStartDate).format(
          'YYYY-MM-DD',
        );
        orderTrendMap.set(orderDate, (orderTrendMap.get(orderDate) || 0) + 1);

        // 依据订单 unitId 关联团购规格，得到单价/成本用于金额口径计算
        const selectedUnit = units.find((unit) => unit.id === order.unitId);

        if (selectedUnit) {
          const originalSalesAmount = round2(
            selectedUnit.price * order.quantity,
          );
          const originalProfitAmount = round2(
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity,
          );
          const originalCostAmount = round2(
            selectedUnit.costPrice * order.quantity,
          );

          let actualSalesAmount = 0;
          let actualProfitAmount = 0;
          if (order.status === OrderStatus.REFUNDED) {
            // 全额退款口径：销售额清零，利润计为负成本（冲减）
            actualSalesAmount = 0;
            actualProfitAmount = -originalCostAmount;
          } else {
            // 部分退款口径：退款金额同时冲减销售额与利润
            const partial = round2(order.partialRefundAmount || 0);
            actualSalesAmount = round2(originalSalesAmount - partial);
            actualProfitAmount = round2(originalProfitAmount - partial);
          }

          totalPrice = round2(totalPrice + actualSalesAmount);
          totalProfit = round2(totalProfit + actualProfitAmount);

          // 当日销售额趋势累加
          priceTrendMap.set(
            orderDate,
            round2((priceTrendMap.get(orderDate) || 0) + actualSalesAmount),
          );
          // 当日利润趋势累加
          profitTrendMap.set(
            orderDate,
            round2((profitTrendMap.get(orderDate) || 0) + actualProfitAmount),
          );
        }
      }
    }

    // ================================================================
    // 步骤三：从映射生成"每日序列"与"累计序列"
    // - 无时间范围：仅返回有数据的日期（自然排序），序列更紧凑
    // - 有时间范围：从 startDate 连续补齐到 endDate，缺失值按 0 处理
    // - 此处仅生成"每日序列"；累计序列先基于每日做一次原始累计
    // ================================================================
    const groupBuyTrend: { date: Date; count: number }[] = [];
    const orderTrend: { date: Date; count: number }[] = [];
    const priceTrend: { date: Date; count: number }[] = [];
    const profitTrend: { date: Date; count: number }[] = [];

    // ------------------------------------------------
    // 对应的"原始累计"序列（在分桶前的累计结果）
    // ------------------------------------------------
    const cumulativeGroupBuyTrend: { date: Date; count: number }[] = [];
    const cumulativeOrderTrend: { date: Date; count: number }[] = [];
    const cumulativePriceTrend: { date: Date; count: number }[] = [];
    const cumulativeProfitTrend: { date: Date; count: number }[] = [];

    // 情况A：未传时间范围（仅返回实际出现过数据的日期）
    if (!startDate || !endDate) {
      // 收集各趋势映射中出现过的日期集合
      const allDates = new Set<string>();
      groupBuyTrendMap.forEach((_, date) => allDates.add(date));
      orderTrendMap.forEach((_, date) => allDates.add(date));
      priceTrendMap.forEach((_, date) => allDates.add(date));
      profitTrendMap.forEach((_, date) => allDates.add(date));

      // 排序后逐日生成：每日值 + 原始累计值
      const sortedDates = Array.from(allDates).sort();
      let cumulativeGroupBuy = 0;
      let cumulativeOrder = 0;
      let cumulativePrice = 0;
      let cumulativeProfit = 0;
      for (const dateStr of sortedDates) {
        const date = dayjs(dateStr).toDate();
        const gb = groupBuyTrendMap.get(dateStr) || 0;
        const od = orderTrendMap.get(dateStr) || 0;
        const pr = round2(priceTrendMap.get(dateStr) || 0);
        const pf = round2(profitTrendMap.get(dateStr) || 0);
        groupBuyTrend.push({ date, count: gb });
        orderTrend.push({ date, count: od });
        priceTrend.push({ date, count: pr });
        profitTrend.push({ date, count: pf });

        cumulativeGroupBuy += gb;
        cumulativeOrder += od;
        cumulativePrice = round2(cumulativePrice + pr);
        cumulativeProfit = round2(cumulativeProfit + pf);
        cumulativeGroupBuyTrend.push({ date, count: cumulativeGroupBuy });
        cumulativeOrderTrend.push({ date, count: cumulativeOrder });
        cumulativePriceTrend.push({ date, count: cumulativePrice });
        cumulativeProfitTrend.push({ date, count: cumulativeProfit });
      }
    } else {
      // 情况B：传入时间范围（严格补齐每一天）
      let currentDate = dayjs(startDate).startOf('day');
      const endDay = dayjs(endDate).startOf('day');
      let cumulativeGroupBuy = 0;
      let cumulativeOrder = 0;
      let cumulativePrice = 0;
      let cumulativeProfit = 0;
      while (currentDate.isSameOrBefore(endDay, 'day')) {
        const dateString = currentDate.format('YYYY-MM-DD');
        const gb = groupBuyTrendMap.get(dateString) || 0;
        const od = orderTrendMap.get(dateString) || 0;
        const pr = round2(priceTrendMap.get(dateString) || 0);
        const pf = round2(profitTrendMap.get(dateString) || 0);
        groupBuyTrend.push({ date: currentDate.toDate(), count: gb });
        orderTrend.push({ date: currentDate.toDate(), count: od });
        priceTrend.push({ date: currentDate.toDate(), count: pr });
        profitTrend.push({ date: currentDate.toDate(), count: pf });

        cumulativeGroupBuy += gb;
        cumulativeOrder += od;
        cumulativePrice = round2(cumulativePrice + pr);
        cumulativeProfit = round2(cumulativeProfit + pf);
        cumulativeGroupBuyTrend.push({
          date: currentDate.toDate(),
          count: cumulativeGroupBuy,
        });
        cumulativeOrderTrend.push({
          date: currentDate.toDate(),
          count: cumulativeOrder,
        });
        cumulativePriceTrend.push({
          date: currentDate.toDate(),
          count: cumulativePrice,
        });
        cumulativeProfitTrend.push({
          date: currentDate.toDate(),
          count: cumulativeProfit,
        });
        currentDate = currentDate.add(1, 'day');
      }
    }

    // ================================================================
    // 步骤四：动态分桶（仅用于"累计趋势"的降采样展示）
    // 动机：长区间逐日累积会导致横轴点位过多，阅读与渲染负担大
    // 策略：保持"每日趋势"原样；仅对"累计趋势"先做分桶聚合，再重建累计
    // 规则：根据区间长度自适应选择桶大小（1/3/7/14/30 天）
    // 原则：
    //   - 同桶内按"日值之和"聚合为单点
    //   - 单点日期取该桶内的"最后一天"，以符合时间线直观感受
    //   - 聚合后再进行一次累计，得到更平滑的累计曲线
    // ================================================================
    const pickBucketSize = (
      first: Date | undefined,
      last: Date | undefined,
    ): number => {
      if (!first || !last) return 1;
      const diffDays = Math.max(1, dayjs(last).diff(dayjs(first), 'day') + 1);
      if (diffDays <= 90) return 1; // 日
      if (diffDays <= 180) return 3; // 3天
      if (diffDays <= 365) return 7; // 周
      if (diffDays <= 730) return 14; // 2周
      return 30; // 月（约）
    };

    const aggregateByBucket = (
      series: { date: Date; count: number }[],
      bucketSize: number,
    ): { date: Date; count: number }[] => {
      if (bucketSize <= 1 || series.length === 0) return series; // 桶大小为1或序列为空时，直接返回
      const sorted = [...series].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const firstDate = dayjs(sorted[0].date).startOf('day');
      const bucketIndexToSum = new Map<number, number>();
      const bucketIndexToLastDate = new Map<number, Date>();
      for (const item of sorted) {
        const daysSinceStart = dayjs(item.date)
          .startOf('day')
          .diff(firstDate, 'day');
        const bucketIndex = Math.floor(daysSinceStart / bucketSize);
        const prev = bucketIndexToSum.get(bucketIndex) || 0;
        bucketIndexToSum.set(bucketIndex, round2(prev + item.count));
        // 保留桶内"最后一天"用于展示（代表该段的时间末尾）
        const currentDay = dayjs(item.date).startOf('day');
        const candidateEnd = currentDay.toDate();
        const existing = bucketIndexToLastDate.get(bucketIndex);
        if (!existing || dayjs(candidateEnd).isAfter(existing)) {
          bucketIndexToLastDate.set(bucketIndex, candidateEnd);
        }
      }
      const result: { date: Date; count: number }[] = [];
      const indices = Array.from(bucketIndexToSum.keys()).sort((a, b) => a - b);
      for (const idx of indices) {
        result.push({
          date: bucketIndexToLastDate.get(idx)!,
          count: bucketIndexToSum.get(idx) || 0,
        });
      }
      return result;
    };

    // ------------------------------------------------
    // 基于"分桶后的每日序列"重建累计曲线
    // ------------------------------------------------
    const rebuildCumulative = (series: { date: Date; count: number }[]) => {
      const res: { date: Date; count: number }[] = [];
      let acc = 0;
      for (const item of series) {
        acc = round2(acc + item.count);
        res.push({ date: item.date, count: acc });
      }
      return res;
    };

    // ------------------------------------------------
    // 计算原始每日序列的起止日期（用于决定桶大小）
    // 说明：若所有每日序列均为空，则无需分桶
    // ------------------------------------------------
    const allDatesForRange: Date[] = [];
    if (groupBuyTrend.length > 0) {
      allDatesForRange.push(
        groupBuyTrend[0].date,
        groupBuyTrend[groupBuyTrend.length - 1].date,
      );
    } else if (orderTrend.length > 0) {
      allDatesForRange.push(
        orderTrend[0].date,
        orderTrend[orderTrend.length - 1].date,
      );
    } else if (priceTrend.length > 0) {
      allDatesForRange.push(
        priceTrend[0].date,
        priceTrend[priceTrend.length - 1].date,
      );
    } else if (profitTrend.length > 0) {
      allDatesForRange.push(
        profitTrend[0].date,
        profitTrend[profitTrend.length - 1].date,
      );
    }
    const first = allDatesForRange.length ? allDatesForRange[0] : undefined;
    const last = allDatesForRange.length ? allDatesForRange[1] : undefined;
    const bucketSize = pickBucketSize(first, last);

    const aggGroupBuyTrend = aggregateByBucket(groupBuyTrend, bucketSize);
    const aggOrderTrend = aggregateByBucket(orderTrend, bucketSize);
    const aggPriceTrend = aggregateByBucket(priceTrend, bucketSize);
    const aggProfitTrend = aggregateByBucket(profitTrend, bucketSize);

    const aggCumulativeGroupBuyTrend = rebuildCumulative(aggGroupBuyTrend);
    const aggCumulativeOrderTrend = rebuildCumulative(aggOrderTrend);
    const aggCumulativePriceTrend = rebuildCumulative(aggPriceTrend);
    const aggCumulativeProfitTrend = rebuildCumulative(aggProfitTrend);

    // ================================================================
    // 步骤五：返回结果（保持既有返回结构与字段命名）
    // - groupBuyTrend/orderTrend/priceTrend/profitTrend：逐日原始序列
    // - cumulativeXXXTrend：分桶后的累计序列（用于前端"累计趋势"展示）
    // ================================================================
    return {
      groupBuyCount,
      orderCount,
      totalPrice,
      totalProfit,
      groupBuyTrend,
      orderTrend,
      priceTrend,
      profitTrend,
      cumulativeGroupBuyTrend: aggCumulativeGroupBuyTrend,
      cumulativeOrderTrend: aggCumulativeOrderTrend,
      cumulativePriceTrend: aggCumulativePriceTrend,
      cumulativeProfitTrend: aggCumulativeProfitTrend,
    };
  }

  /**
   * 获取客户排行数据（Top10）
   * 口径约定：
   * - 时间：按"团购发起时间 groupBuyStartDate"过滤关联的团购；未传入则统计全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]（不含已退款）。
   * - 金额：订单金额 = 单价*数量 - 部分退款金额（仅退款不退货）。
   * 输出：三类排行榜（订单量、总消费额、平均订单额）各取前 10。
   */
  async getCustomerRank(
    params: AnalysisCountParams,
  ): Promise<CustomerRankResult> {
    // ================================================================
    // 步骤一：读取订单（包含客户与团购规格）
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：通过关联团购的 groupBuyStartDate 进行过滤
    // - 字段：仅保留计算所需字段，降低数据体积
    // ================================================================
    const { startDate, endDate } = params;

    const orders = await this.prisma.order.findMany({
      where: {
        delete: 0,
        status: {
          in: [OrderStatus.PAID, OrderStatus.COMPLETED],
        },
        groupBuy: {
          ...(startDate && endDate
            ? {
                groupBuyStartDate: {
                  gte: startDate,
                  lte: endDate,
                },
              }
            : {}),
        },
      },
      select: {
        quantity: true,
        unitId: true,
        partialRefundAmount: true, // 部分退款金额（用于冲减订单金额）
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        groupBuy: {
          select: {
            units: true,
          },
        },
      },
    });

    // ================================================================
    // 步骤二：按客户维度聚合
    // - Map(key=customerId) 存储客户基础信息与累积指标
    // - 指标：orderCount（订单量）、totalAmount（总消费额）
    // ================================================================
    const customerData = new Map<
      string,
      {
        id: string;
        name: string;
        phone: string;
        orderCount: number;
        totalAmount: number;
      }
    >();

    for (const order of orders) {
      if (!order.customer) continue;

      const customerId = order.customer.id;
      const customerName = order.customer.name || '';
      const customerPhone = order.customer.phone || '';
      const units = order.groupBuy.units as Array<GroupBuyUnit>;

      // 计算订单金额：单价*数量 - 部分退款（不涉及利润口径）
      let orderAmount = 0;
      const selectedUnit = units.find((unit) => unit.id === order.unitId);
      if (selectedUnit) {
        const originalAmount = selectedUnit.price * order.quantity;
        orderAmount = originalAmount - (order.partialRefundAmount || 0);
      }

      if (customerData.has(customerId)) {
        const existing = customerData.get(customerId)!;
        existing.orderCount += 1;
        existing.totalAmount += orderAmount;
      } else {
        customerData.set(customerId, {
          id: customerId,
          name: customerName,
          phone: customerPhone,
          orderCount: 1,
          totalAmount: orderAmount,
        });
      }
    }

    // ================================================================
    // 步骤三：派生平均订单额并转为数组
    // - averageOrderAmount = totalAmount / orderCount（订单量为0时兜底为0）
    // ================================================================
    const customersArray = Array.from(customerData.values()).map(
      (customer) => ({
        ...customer,
        averageOrderAmount:
          customer.orderCount > 0
            ? customer.totalAmount / customer.orderCount
            : 0,
      }),
    );

    // ================================================================
    // 步骤四：生成排行榜（各取 Top10）
    // - 订单量/总消费额/平均订单额三类榜单，均按降序
    // ================================================================
    const customerRankByOrderCount = [...customersArray]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);
    const customerRankByTotalAmount = [...customersArray]
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10);
    const customerRankByAverageOrderAmount = [...customersArray]
      .sort((a, b) => b.averageOrderAmount - a.averageOrderAmount)
      .slice(0, 10);

    return {
      customerRankByOrderCount,
      customerRankByTotalAmount,
      customerRankByAverageOrderAmount,
    };
  }

  /**
   * 获取团购单合并概况数据
   * 针对同名的团购单进行聚合分析
   */
  async getMergedGroupBuyOverview(
    params: MergedGroupBuyOverviewParams,
  ): Promise<MergedGroupBuyOverviewResult> {
    // ================================================================
    // 接口：团购单（按名称合并）概况列表
    // 目标：将同名团购按供货商ID聚合，统计销售额、利润、订单量、客户数等，并支持排序分页
    // 过滤：delete=0；可选 groupBuyName 模糊、supplierIds 精确、时间范围 groupBuyStartDate
    // 订单口径：delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]
    // 指标口径：
    //   - totalRevenue（总销售额）：退款订单记 0；部分退款按金额直减
    //   - totalProfit（总利润）：退款订单记 -成本；部分退款按金额直减
    //   - totalOrderCount（订单量）：仅计 PAID/COMPLETED
    //   - uniqueCustomerCount（去重客户数）：按 customerId 去重
    //   - totalProfitMargin（利润率%）：totalProfit/totalRevenue*100（分母为0时记0）
    //   - averageCustomerOrderValue（客单价）：totalRevenue/uniqueCustomerCount（分母为0时记0）
    // 排序：支持多字段（默认 totalRevenue），再分页返回
    // ================================================================
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      groupBuyName,
      supplierIds,
      sortField = 'totalRevenue',
      sortOrder = 'desc',
      mergeSameName = true,
    } = params;

    // 1) 构建查询条件（按名称/供货商/时间过滤）
    const whereCondition = {
      delete: 0,
      ...(groupBuyName && {
        name: {
          contains: groupBuyName,
        },
      }),
      ...(supplierIds &&
        supplierIds.length > 0 && {
          supplierId: {
            in: supplierIds,
          },
        }),
      // 时间过滤（若提供）
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2) 获取团购及订单数据（含供货商信息）
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: whereCondition,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        order: {
          where: {
            delete: 0,
            status: {
              in: [
                OrderStatus.PAID,
                OrderStatus.COMPLETED,
                OrderStatus.REFUNDED,
              ],
            },
          },
          select: {
            quantity: true,
            unitId: true,
            customerId: true,
            status: true,
            partialRefundAmount: true,
          },
        },
      },
    });

    // 3) 初始化聚合容器：按 mergeSameName 决定聚合键
    const mergedDataMap = new Map<
      string,
      {
        groupBuyName: string;
        supplierId: string;
        supplierName: string;
        totalRevenue: number;
        totalProfit: number;
        totalOrderCount: number;
        uniqueCustomerIds: Set<string>;
        totalQuantity: number;
        groupBuyStartDate?: Date;
      }
    >();

    // 4) 遍历团购，按名称+供货商累计
    for (const groupBuy of groupBuysWithOrders) {
      const groupBuyName = groupBuy.name;
      const supplierId = groupBuy.supplierId;
      const supplierName = groupBuy.supplier?.name || '未知供货商';
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 生成唯一键
      // 合并模式：团购名称 + 供货商ID
      // 单期模式：团购ID（每期单独统计）
      const uniqueKey = mergeSameName
        ? `${groupBuyName}|${supplierId}`
        : groupBuy.id;

      // 如果该名称和供货商的团购单还未在Map中，则初始化
      if (!mergedDataMap.has(uniqueKey)) {
        mergedDataMap.set(uniqueKey, {
          groupBuyName,
          supplierId,
          supplierName,
          totalRevenue: 0,
          totalProfit: 0,
          totalOrderCount: 0,
          uniqueCustomerIds: new Set<string>(),
          totalQuantity: 0,
          // 单期模式下记录发起时间
          ...(mergeSameName
            ? {}
            : { groupBuyStartDate: groupBuy.groupBuyStartDate }),
        });
      }

      const mergedData = mergedDataMap.get(uniqueKey)!;

      // 4.1) 遍历当前团购单的订单，按金额与口径累计
      for (const order of groupBuy.order as Array<{
        quantity: number;
        unitId: string;
        customerId: string;
        partialRefundAmount?: number;
        status: OrderStatus;
      }>) {
        // 根据 unitId 匹配团购规格（获取单价/成本）
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          // 原始金额（未考虑退款）
          const originalRevenue = selectedUnit.price * order.quantity;
          const originalProfit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCost = selectedUnit.costPrice * order.quantity;
          const partialRefundAmount = order.partialRefundAmount || 0;

          // 金额口径：
          // - 全额退款：收入=0，利润=-成本
          // - 部分退款：收入/利润均减去退款金额
          const revenue =
            order.status === OrderStatus.REFUNDED
              ? 0
              : originalRevenue - partialRefundAmount;
          const profit =
            order.status === OrderStatus.REFUNDED
              ? -originalCost
              : originalProfit - partialRefundAmount;
          mergedData.totalRevenue += revenue;
          mergedData.totalProfit += profit;
          // 订单量仅计入已支付/已完成
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            mergedData.totalOrderCount += 1;
          }
          mergedData.uniqueCustomerIds.add(order.customerId);
          mergedData.totalQuantity += order.quantity;
        }
      }
    }

    // 5) 转换为数组并计算派生指标（利润率/客单价）
    const mergedDataArray = Array.from(mergedDataMap.values()).map((data) => {
      const uniqueCustomerCount = data.uniqueCustomerIds.size;
      const totalProfitMargin =
        data.totalRevenue > 0
          ? (data.totalProfit / data.totalRevenue) * 100
          : 0;
      const averageCustomerOrderValue =
        uniqueCustomerCount > 0 ? data.totalRevenue / uniqueCustomerCount : 0;

      return {
        groupBuyName: data.groupBuyName,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        totalRevenue: data.totalRevenue,
        totalProfit: data.totalProfit,
        totalProfitMargin,
        totalOrderCount: data.totalOrderCount,
        uniqueCustomerCount,
        averageCustomerOrderValue,
        groupBuyStartDate: data.groupBuyStartDate,
      };
    });

    // 6) 排序：根据 sortField + sortOrder
    mergedDataArray.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      switch (sortField) {
        case 'totalRevenue':
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'totalProfit':
          aValue = a.totalProfit;
          bValue = b.totalProfit;
          break;
        case 'profitMargin':
          aValue = a.totalProfitMargin;
          bValue = b.totalProfitMargin;
          break;
        case 'uniqueCustomerCount':
          aValue = a.uniqueCustomerCount;
          bValue = b.uniqueCustomerCount;
          break;
        case 'totalOrderCount':
          aValue = a.totalOrderCount;
          bValue = b.totalOrderCount;
          break;
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });

    // 7) 分页处理
    const total = mergedDataArray.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedData = mergedDataArray.slice(startIndex, endIndex);

    return {
      list: paginatedData,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取团购单合并概况详情数据
   */
  async getMergedGroupBuyOverviewDetail(
    params: MergedGroupBuyOverviewDetailParams,
  ): Promise<MergedGroupBuyOverviewDetail> {
    // ================================================================
    // 接口：团购单（按名称合并）概况详情
    // 目标：针对某个团购名称 + 供货商，输出多维度指标（核心业绩、客户分析、地域分析、历史记录等）
    // 过滤：delete=0；可选时间范围 groupBuyStartDate
    // 订单口径：delete=0；金额含退款口径，订单量仅计已付/完成
    // 主要步骤：
    //   1) 拉取目标团购及订单，按规则累计 revenue/profit/partialRefund/orderCount 等
    //   2) 统计客户分布（购买次数分桶）、地域分布、历史发起记录（含退款数）
    //   3) 计算各类派生指标：利润率、客单价、复购率等
    // ================================================================
    const { groupBuyName, supplierId, startDate, endDate } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
      supplierId: supplierId,
      delete: 0,
      // 如果提供了时间参数，则添加时间过滤条件
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2. 查询指定名称的团购单及其订单数据（包含所有状态的订单）
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: whereCondition,
      include: {
        supplier: true,
        product: true,
        order: {
          where: {
            delete: 0,
          },
          select: {
            quantity: true,
            unitId: true,
            customerId: true,
            status: true,
            partialRefundAmount: true,
            customer: {
              include: {
                customerAddress: true,
              },
            },
          },
        },
      },
    });

    // 2.1 单独查询退款订单数据
    // 已迁移到每个团购历史项进行统计
    // 已移除：详情级别不再返回退款总数，由团购历史中的每条记录提供 refundedOrderCount

    if (groupBuysWithOrders.length === 0) {
      // 如果没有找到数据，返回空的详情对象
      return {
        groupBuyName,
        supplierId: supplierId,
        supplierName: '',
        startDate,
        endDate,
        totalRevenue: 0,
        totalProfit: 0,
        totalPartialRefundAmount: 0,
        totalProfitMargin: 0,
        totalOrderCount: 0,
        uniqueCustomerCount: 0,
        averageCustomerOrderValue: 0,
        totalGroupBuyCount: 0,
        customerPurchaseFrequency: [],
        multiPurchaseCustomerCount: 0,
        multiPurchaseCustomerRatio: 0,
        repeatCustomerCount: 0,
        repeatCustomerRatio: 0,
        regionalSales: [],
        groupBuyLaunchHistory: [],
      };
    }

    // 2. 聚合数据计算
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalPartialRefundAmount = 0;
    let totalOrderCount = 0;
    const uniqueCustomerIds = new Set<string>();
    const customerPurchaseCounts = new Map<string, number>();
    const regionalCustomers = new Map<string, Set<string>>();
    const supplierNamesSet = new Set<string>();

    for (const groupBuy of groupBuysWithOrders) {
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 收集供货商名称
      if (groupBuy.supplier && groupBuy.supplier.name) {
        supplierNamesSet.add(groupBuy.supplier.name);
      }

      // 遍历当前团购单的所有订单（只统计已支付和已完成的订单）
      for (const order of groupBuy.order) {
        // 收入与利润统计：包含已支付、已完成、已退款
        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.COMPLETED ||
          order.status === OrderStatus.REFUNDED
        ) {
          // 根据unitId找到对应的规格信息
          const selectedUnit = units.find((unit) => unit.id === order.unitId);
          if (selectedUnit) {
            // 仅退款不退货：部分退款按绝对值扣利润；全额退款利润为-成本
            const originalRevenue = selectedUnit.price * order.quantity;
            const originalProfit =
              (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
            const originalCost = selectedUnit.costPrice * order.quantity;
            const partialRefundAmount = order.partialRefundAmount || 0;

            const revenue =
              order.status === OrderStatus.REFUNDED
                ? 0
                : originalRevenue - partialRefundAmount;
            const profit =
              order.status === OrderStatus.REFUNDED
                ? -originalCost
                : originalProfit - partialRefundAmount;

            totalRevenue += revenue;
            totalProfit += profit;
            totalPartialRefundAmount += partialRefundAmount;
            // 订单量统计：仅统计已支付与已完成
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              totalOrderCount += 1;
            }
            uniqueCustomerIds.add(order.customerId);

            // 统计客户购买次数
            const currentCount =
              customerPurchaseCounts.get(order.customerId) || 0;
            customerPurchaseCounts.set(order.customerId, currentCount + 1);

            // 统计地域销售数据
            const customerAddress = order.customer.customerAddress;
            if (customerAddress) {
              const addressKey = `${customerAddress.id}|${customerAddress.name}`;
              if (!regionalCustomers.has(addressKey)) {
                regionalCustomers.set(addressKey, new Set<string>());
              }
              regionalCustomers.get(addressKey)!.add(order.customerId);
            }
          }
        }
      }
    }

    // 3. 计算派生指标
    const uniqueCustomerCount = uniqueCustomerIds.size;
    const averageCustomerOrderValue =
      uniqueCustomerCount > 0 ? totalRevenue / uniqueCustomerCount : 0;
    const totalGroupBuyCount = groupBuysWithOrders.length;
    const totalProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // 4. 客户购买次数分布统计
    const purchaseFrequencyMap = new Map<number, number>();
    for (const count of customerPurchaseCounts.values()) {
      const currentFreq = purchaseFrequencyMap.get(count) || 0;
      purchaseFrequencyMap.set(count, currentFreq + 1);
    }

    // 根据团购单数量动态规划分桶：
    // - >=20: 1,2,3,4, 5-9, 10-19, 20-39, 40+
    // - >=10: 1,2,3,4, 5-9, 10+
    // - >=5:  1,2,3,4, 5+
    // - 其他: 1..totalGroupBuyCount（逐一列出）
    const buildBuckets = (
      gbCount: number,
    ): Array<{ min: number; max?: number | null }> => {
      if (gbCount >= 20) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: 9 },
          { min: 10, max: 19 },
          { min: 20, max: 39 },
          { min: 40, max: null },
        ];
      }
      if (gbCount >= 10) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: 9 },
          { min: 10, max: null },
        ];
      }
      if (gbCount >= 5) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: null },
        ];
      }
      // gbCount < 5 的情况，逐一列出存在的次数
      const buckets: Array<{ min: number; max?: number | null }> = [];
      for (let i = 1; i <= Math.max(1, gbCount); i += 1) {
        buckets.push({ min: i, max: i });
      }
      return buckets;
    };

    const buckets = buildBuckets(totalGroupBuyCount);

    const customerPurchaseFrequency: CustomerPurchaseFrequency[] = buckets
      .map((bucket) => {
        const { min, max } = bucket;
        let sum = 0;
        for (const [
          purchaseCount,
          customerCount,
        ] of purchaseFrequencyMap.entries()) {
          if (max == null) {
            if (purchaseCount >= min) sum += customerCount;
          } else if (purchaseCount >= min && purchaseCount <= max) {
            sum += customerCount;
          }
        }
        return {
          minFrequency: min,
          maxFrequency: max ?? null,
          count: sum,
        };
      })
      .filter((b) => b.count > 0);

    // 5. 多次购买客户统计
    const multiPurchaseCustomerCount = Array.from(
      customerPurchaseCounts.values(),
    ).filter((count) => count > 1).length;
    const multiPurchaseCustomerRatio =
      uniqueCustomerCount > 0
        ? (multiPurchaseCustomerCount / uniqueCustomerCount) * 100
        : 0;

    // 6. 地域销售分析
    const regionalSalesResult: RegionalSalesItem[] = Array.from(
      regionalCustomers.entries(),
    ).map(([addressKey, customerSet]) => {
      const [addressId, addressName] = addressKey.split('|');
      return {
        addressId,
        addressName,
        customerCount: customerSet.size,
      };
    });

    // 7. 团购发起历史记录
    const groupBuyLaunchHistory: GroupBuyLaunchHistory[] =
      groupBuysWithOrders.map((groupBuy) => {
        // 计算该次团购的订单数量、客户数量和销售额
        let orderCount = 0;
        let revenue = 0;
        let profit = 0;
        let partialRefundAmount = 0;
        const customerIds = new Set<string>();
        const units = groupBuy.units as Array<GroupBuyUnit>;

        for (const order of groupBuy.order) {
          // 只统计已支付和已完成的订单
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            orderCount += 1;
            customerIds.add(order.customerId);
            const selectedUnit = units.find((unit) => unit.id === order.unitId);
            if (selectedUnit) {
              // 部分退款按绝对值扣利润；全额退款不计入此分支（因未计入订单量）
              const originalRevenue = selectedUnit.price * order.quantity;
              const originalProfit =
                (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
              const orderPartialRefundAmount = order.partialRefundAmount || 0;

              const orderRevenue = originalRevenue - orderPartialRefundAmount;
              const orderProfit = originalProfit - orderPartialRefundAmount;

              revenue += orderRevenue;
              profit += orderProfit;
              partialRefundAmount += orderPartialRefundAmount;
            }
          }
          // 已退款订单：收入为0、利润为-成本，计入损益但不计入订单量
          else if (order.status === OrderStatus.REFUNDED) {
            const selectedUnit = units.find((unit) => unit.id === order.unitId);
            if (selectedUnit) {
              const originalCost = selectedUnit.costPrice * order.quantity;
              profit += -originalCost;
              // revenue 加 0
              // partialRefundAmount 在此无需增加，明细展示仍以已支付/完成订单为准
            }
          }
        }

        // 统计该次团购的退款订单数
        // 注意：退款订单不计入收入/利润，但用于历史项展示
        const refundedOrderCount = groupBuy.order.filter(
          (o) => o.status === OrderStatus.REFUNDED,
        ).length;

        return {
          groupBuyId: groupBuy.id,
          groupBuyName: groupBuy.name,
          launchDate: groupBuy.groupBuyStartDate,
          orderCount,
          revenue,
          profit,
          partialRefundAmount,
          customerCount: customerIds.size,
          refundedOrderCount,
        };
      });

    // 按发起时间排序（从新到旧）
    groupBuyLaunchHistory.sort(
      (a, b) => b.launchDate.getTime() - a.launchDate.getTime(),
    );

    // 获取供货商信息
    const supplierName = groupBuysWithOrders[0]?.supplier?.name || '未知供货商';

    return {
      groupBuyName,
      supplierId: supplierId,
      supplierName: supplierName,
      startDate,
      endDate,
      totalRevenue,
      totalProfit,
      totalPartialRefundAmount,
      totalProfitMargin,
      totalOrderCount,
      uniqueCustomerCount,
      averageCustomerOrderValue,
      totalGroupBuyCount,
      customerPurchaseFrequency,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      // 对齐供货商详情增加复购指标
      repeatCustomerCount: Array.from(customerPurchaseCounts.values()).filter(
        (c) => c > 1,
      ).length,
      repeatCustomerRatio:
        uniqueCustomerCount > 0
          ? (Array.from(customerPurchaseCounts.values()).filter((c) => c > 1)
              .length /
              uniqueCustomerCount) *
            100
          : 0,
      regionalSales: regionalSalesResult,
      groupBuyLaunchHistory,
    };
  }

  /**
   * 获取特定购买频次的客户列表（团购合并维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 频次：支持精确频次 frequency，或范围 [minFrequency, maxFrequency]。
   * 输出：符合频次条件的客户基本信息及其购买次数（purchaseCount）。
   */
  async getMergedGroupBuyFrequencyCustomers(
    params: MergedGroupBuyFrequencyCustomersParams,
  ): Promise<MergedGroupBuyFrequencyCustomersResult> {
    // ================================================================
    // 步骤一：构建查询条件并拉取订单
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：按 groupBuyStartDate 过滤
    // - 字段：仅保留客户基本信息，用于统计与返回
    // ================================================================
    const {
      groupBuyName,
      supplierId,
      frequency,
      minFrequency,
      maxFrequency,
      startDate,
      endDate,
    } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
      supplierId: supplierId,
      delete: 0,
      // 如果提供了时间参数，则添加时间过滤条件
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2) 查询指定名称的团购单及其订单数据
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: whereCondition,
      include: {
        order: {
          where: {
            delete: 0,
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    // 3) 统计每个客户的购买次数
    const customerPurchaseCounts = new Map<
      string,
      {
        customer: CustomerBasicInfo;
        count: number;
      }
    >();

    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerId = order.customer.id;
        const customerInfo = {
          customerId: order.customer.id,
          customerName: order.customer.name,
        };

        if (customerPurchaseCounts.has(customerId)) {
          const existing = customerPurchaseCounts.get(customerId)!;
          existing.count += 1;
        } else {
          customerPurchaseCounts.set(customerId, {
            customer: customerInfo,
            count: 1,
          });
        }
      }
    }

    // 4) 应用频次过滤（单值或范围）
    const minF = minFrequency ?? frequency ?? 0;
    const maxF = maxFrequency ?? frequency ?? Number.POSITIVE_INFINITY;

    const filteredCustomers = Array.from(customerPurchaseCounts.values())
      .filter((item) => item.count >= minF && item.count <= maxF)
      .map((item) => ({ ...item.customer, purchaseCount: item.count }));

    return {
      groupBuyName,
      // 保留 frequency 字段用于兼容（取 frequency 或 minF）
      frequency: frequency ?? minF,
      customers: filteredCustomers,
    };
  }

  /**
   * 获取特定区域的客户列表（团购合并维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 区域：根据客户地址 addressId 进行筛选，客户去重返回。
   * 输出：指定区域下的客户基本信息列表，并附带地址名称。
   */
  async getMergedGroupBuyRegionalCustomers(
    params: MergedGroupBuyRegionalCustomersParams,
  ): Promise<MergedGroupBuyRegionalCustomersResult> {
    // ================================================================
    // 步骤一：构建查询条件与数据拉取
    // - 仅取 delete=0 且状态为已支付/已完成的订单
    // - 时间通过 groupBuyStartDate 过滤
    // - 选择客户与地址字段用于筛选与返回
    // ================================================================
    const { groupBuyName, supplierId, addressId, startDate, endDate } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
      supplierId: supplierId,
      delete: 0,
      // 如果提供了时间参数，则添加时间过滤条件
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2) 查询指定名称的团购单及其订单数据
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: whereCondition,
      include: {
        order: {
          where: {
            delete: 0,
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
          },
          include: {
            customer: {
              include: {
                customerAddress: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 3) 筛选指定区域的客户并去重
    const regionalCustomers = new Map<string, CustomerBasicInfo>();

    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerAddress = order.customer.customerAddress;
        if (customerAddress && customerAddress.id === addressId) {
          const customerId = order.customer.id;
          if (!regionalCustomers.has(customerId)) {
            regionalCustomers.set(customerId, {
              customerId: order.customer.id,
              customerName: order.customer.name,
            });
          }
        }
      }
    }

    // 4) 获取地址名称（从符合条件的订单中提取一次）
    let addressName = '';
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerAddress = order.customer.customerAddress;
        if (customerAddress && customerAddress.id === addressId) {
          addressName = customerAddress.name;
          break;
        }
      }
      if (addressName) break;
    }

    return {
      groupBuyName,
      addressId,
      addressName,
      customers: Array.from(regionalCustomers.values()),
    };
  }

  /**
   * 获取供货商概况数据
   * 按供货商维度统计销售、订单、客户等数据，用于供货商概况列表展示
   *
   * @param params 查询参数，包含时间范围、分页、搜索、排序等条件
   * @returns 供货商概况分页结果，包含供货商列表和分页信息
   *
   * 统计维度：
   * - 总销售额：供货商所有团购单的销售总额
   * - 总利润：供货商所有团购单的利润总额
   * - 总订单量：供货商所有团购单的订单总数
   * - 参与客户数：去重后的客户数量
   * - 团购单数：供货商发起的团购单总数
   * - 平均利润率：总利润/总销售额的百分比
   * - 活跃天数：有订单的天数
   * - 最近订单日期：最后一次订单的时间
   */
  async getSupplierOverview(
    params: SupplierOverviewParams,
  ): Promise<SupplierOverviewResult> {
    // ================================================================
    // 接口：供货商概况列表（按供货商维度）
    // 目标：聚合供货商在指定时间范围内的核心指标并分页返回
    // 过滤：供应商 delete=0；团购 delete=0；按 groupBuyStartDate 进行时间过滤
    // 订单口径：delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]
    // 指标口径：
    //   - 总销售额 totalRevenue：退款订单记 0；部分退款直减
    //   - 总利润 totalProfit：退款订单记 -成本；部分退款直减
    //   - 总订单量 totalOrderCount：仅计 PAID/COMPLETED
    //   - 参与客户数 uniqueCustomerCount：去重客户ID
    //   - 团购单数 totalGroupBuyCount：该供应商匹配的团购数量
    //   - 平均利润率 averageProfitMargin：totalProfit/totalRevenue*100（分母为0时为0）
    // ================================================================
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      supplierName,
      sortField = 'totalRevenue',
      sortOrder = 'desc',
    } = params;

    // 1) 构建供货商查询条件（基础 + 名称模糊）
    const whereCondition = {
      delete: 0, // 只查询未删除的供货商
      ...(supplierName && {
        name: {
          contains: supplierName, // 按供货商名称模糊匹配
        },
      }),
    };

    // 2) 获取供货商及其团购/订单数据（避免 N+1）
    // - 包含关系：供货商 -> 团购单 -> 订单
    // - 时间过滤：groupBuyStartDate（若提供）
    const suppliersWithData = await this.prisma.supplier.findMany({
      where: whereCondition,
      include: {
        groupBuy: {
          where: {
            delete: 0, // 只查询未删除的团购单
            // 时间过滤：如果提供了时间参数，则只查询指定时间范围内的团购单
            ...(startDate &&
              endDate && {
                groupBuyStartDate: {
                  gte: startDate, // 团购发起时间 >= 开始时间
                  lte: endDate, // 团购发起时间 <= 结束时间
                },
              }),
          },
          include: {
            order: {
              where: {
                delete: 0, // 只查询未删除的订单
                status: {
                  in: [
                    OrderStatus.PAID,
                    OrderStatus.COMPLETED,
                    OrderStatus.REFUNDED,
                  ],
                },
              },
              select: {
                quantity: true, // 购买数量
                unitId: true, // 规格ID
                customerId: true, // 客户ID
                createdAt: true, // 订单创建时间
                partialRefundAmount: true, // 部分退款金额
                status: true,
              },
            },
          },
        },
      },
    });

    // 3) 计算每个供货商的统计数据
    // - 遍历团购与订单，按金额与口径累计
    // - 退款：收入=0，利润=-成本；部分退款：直减
    // - 订单量：仅计已支付/已完成
    const supplierStats: SupplierOverviewListItem[] = [];

    for (const supplier of suppliersWithData) {
      // 初始化统计容器
      const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息，用于计算价格和利润
      const uniqueCustomerIds = new Set<string>(); // 去重客户ID，用于统计参与客户数
      let totalRevenue = 0; // 总销售额
      let totalProfit = 0; // 总利润
      let totalOrderCount = 0; // 总订单量

      // 遍历该供货商的所有团购单
      for (const groupBuy of supplier.groupBuy) {
        const groupBuyUnits = groupBuy.units as Array<GroupBuyUnit>;

        // 规格信息缓存到 Map（用于后续快速查价/成本）
        for (const unit of groupBuyUnits) {
          units.set(unit.id, unit);
        }

        // 遍历该团购单的所有订单，计算各项统计数据
        for (const order of groupBuy.order) {
          const unit = units.get(order.unitId);
          if (unit) {
            // 金额计算（仅退款不退货规则）
            const originalRevenue = unit.price * order.quantity;
            const originalProfit =
              (unit.price - unit.costPrice) * order.quantity;
            const originalCost = unit.costPrice * order.quantity;

            const partial = order.partialRefundAmount || 0;
            const orderRevenue =
              order.status === OrderStatus.REFUNDED
                ? 0
                : originalRevenue - partial;
            const orderProfit =
              order.status === OrderStatus.REFUNDED
                ? -originalCost
                : originalProfit - partial;

            // 累加到供货商总统计
            totalRevenue += orderRevenue;
            totalProfit += orderProfit;
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              totalOrderCount++;
            }
            uniqueCustomerIds.add(order.customerId); // 添加客户ID到去重集合
          }
        }
      }

      // 派生指标：平均利润率（总利润/总销售额*100）
      const averageProfitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // 构建供货商统计结果对象
      supplierStats.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalRevenue, // 总销售额
        totalProfit, // 总利润
        totalOrderCount, // 总订单量
        uniqueCustomerCount: uniqueCustomerIds.size, // 参与客户数（去重）
        totalGroupBuyCount: supplier.groupBuy.length, // 团购单数
        averageProfitMargin, // 平均利润率
      });
    }

    // 4) 排序处理（按指定字段与方向）
    supplierStats.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      // 选择比较字段
      switch (sortField) {
        case 'totalRevenue': // 按总销售额排序
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'totalProfit': // 按总利润排序
          aValue = a.totalProfit;
          bValue = b.totalProfit;
          break;
        case 'totalOrderCount': // 按总订单量排序
          aValue = a.totalOrderCount;
          bValue = b.totalOrderCount;
          break;
        case 'uniqueCustomerCount': // 按参与客户数排序
          aValue = a.uniqueCustomerCount;
          bValue = b.uniqueCustomerCount;
          break;
        case 'totalGroupBuyCount': // 按团购单数排序
          aValue = a.totalGroupBuyCount;
          bValue = b.totalGroupBuyCount;
          break;
        case 'averageProfitMargin': // 按平均利润率排序
          aValue = a.averageProfitMargin;
          bValue = b.averageProfitMargin;
          break;
        default: // 默认按总销售额排序
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      // 返回升/降序结果
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // 5) 分页处理
    const startIndex = (page - 1) * pageSize; // 起始索引
    const endIndex = startIndex + pageSize; // 结束索引
    const paginatedList = supplierStats.slice(startIndex, endIndex); // 截取指定页的数据

    return {
      list: paginatedList,
      total: supplierStats.length,
      page,
      pageSize,
    };
  }

  /**
   * 获取供货商概况详情数据（多维度分析）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计该供货商全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]。
   * - 金额：
   *   · 全额退款：销售额=0，利润=-成本（损益冲减）。
   *   · 部分退款：销售额与利润同时减去退款金额（仅退款不退货）。
   * - 订单量：仅计入 PAID/COMPLETED（退款不计订单量）。
   * - 客户与地域：基于订单关联客户/地址做去重统计。
   * 输出：
   * - 核心业绩、客户、商品、分类、地域、历史记录等多维度详情，用于详情页展示。
   */
  async getSupplierOverviewDetail(
    params: SupplierOverviewDetailParams,
  ): Promise<SupplierOverviewDetail> {
    // ================================================================
    // 步骤一：参数校验与供货商存在性检查
    // - 若供货商不存在，直接抛错
    // - 后续统计全部建立在合法供货商之上
    // ================================================================
    const { supplierId, startDate, endDate } = params;

    // 1. 获取供货商基本信息
    // 首先验证供货商是否存在，如果不存在则抛出错误
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new Error('供货商不存在');
    }

    // ================================================================
    // 步骤二：拉取供货商团购与订单数据
    // - 查询策略：一次性拉取，避免 N+1
    // - 包含关系：团购 -> 产品 -> 分类；团购 -> 订单 -> 客户 -> 地址
    // - 时间过滤：groupBuyStartDate（若提供）
    // ================================================================
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        supplierId, // 指定供货商ID
        delete: 0, // 只查询未删除的团购单
        // 时间过滤：如果提供了时间参数，则只查询指定时间范围内的团购单
        // 如果没有提供时间参数，则查询该供货商的全部数据
        ...(startDate &&
          endDate && {
            groupBuyStartDate: {
              gte: startDate, // 团购发起时间 >= 开始时间
              lte: endDate, // 团购发起时间 <= 结束时间
            },
          }),
      },
      include: {
        product: {
          include: {
            productType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        order: {
          where: {
            delete: 0,
            status: {
              in: [
                OrderStatus.PAID,
                OrderStatus.COMPLETED,
                OrderStatus.REFUNDED,
              ],
            },
          },
          select: {
            quantity: true,
            unitId: true,
            customerId: true,
            createdAt: true,
            status: true,
            partialRefundAmount: true,
            customer: {
              select: {
                customerAddress: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // ================================================================
    // 步骤三：初始化统计容器
    // - Map/Set：高效聚合与去重
    // - 指标容器：商品/分类/地域/历史等结构
    // ================================================================
    const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息
    const uniqueCustomerIds = new Set<string>(); // 去重客户ID集合
    const repeatCustomerIds = new Set<string>(); // 复购客户ID集合
    const customerPurchaseCounts = new Map<string, number>(); // 客户购买次数统计Map
    const productStats = new Map<string, TopProductItem>(); // 商品统计Map
    const categoryStats = new Map<string, ProductCategoryStat>(); // 分类统计Map
    const regionalStats = new Map<
      string,
      { addressId: string; addressName: string; customerIds: Set<string> }
    >(); // 地域统计Map，使用Set去重客户
    const groupBuyHistory: GroupBuyLaunchHistory[] = []; // 团购历史记录数组
    // 为分类统计维护去重的商品ID集合，用于准确计算 productCount
    const categoryProductIds = new Map<string, Set<string>>();

    // 核心统计变量
    let totalRevenue = 0; // 总销售额
    let totalProfit = 0; // 总利润
    let totalPartialRefundAmount = 0; // 总部分退款金额
    let totalOrderCount = 0; // 总订单量
    // 退款订单数（与合并团购统计保持一致统计口径）
    // 已移除：详情级别不再返回退款总数，由团购历史中的每条记录提供 refundedOrderCount

    // ================================================================
    // 步骤四：逐团购与订单累计指标
    // - 金额口径：退款=负成本；部分退款直减
    // - 订单量：仅计 PAID/COMPLETED
    // - 侧写：同步累计商品/分类/地域/客户等多维指标
    // ================================================================
    for (const groupBuy of groupBuysWithOrders) {
      const groupBuyUnits = groupBuy.units as Array<GroupBuyUnit>; // 获取团购规格信息
      const groupBuyCustomerIds = new Set<string>(); // 该团购单的客户ID集合
      let groupBuyRevenue = 0; // 该团购单的销售额
      let groupBuyProfit = 0; // 该团购单的利润
      let groupBuyPartialRefundAmount = 0; // 该团购单的部分退款金额
      let groupBuyOrderCount = 0; // 该团购单的订单数

      // 将团购单的规格信息添加到units Map中
      // 规格信息包含价格和成本价，用于后续计算销售额和利润
      for (const unit of groupBuyUnits) {
        units.set(unit.id, unit);
      }

      // 遍历该团购单的所有订单，计算各项统计数据
      for (const order of groupBuy.order) {
        const unit = units.get(order.unitId);
        if (!unit) continue;

        const originalRevenue = unit.price * order.quantity;
        const originalProfit = (unit.price - unit.costPrice) * order.quantity;
        const partialRefundAmount = order.partialRefundAmount || 0;

        if (order.status === OrderStatus.REFUNDED) {
          // 全额退款：收入=0，利润=-成本；不计订单量/客户/地域
          const refundedCost = unit.costPrice * order.quantity;
          totalProfit += -refundedCost;
          groupBuyProfit += -refundedCost;

          // 同步将负成本计入商品与分类的利润（不增加订单量/商品数量）
          const productKey = groupBuy.product.id;
          if (!productStats.has(productKey)) {
            productStats.set(productKey, {
              productId: groupBuy.product.id,
              productName: groupBuy.product.name,
              categoryId: groupBuy.product.productType.id,
              categoryName: groupBuy.product.productType.name,
              totalRevenue: 0,
              totalProfit: 0,
              orderCount: 0,
              groupBuyCount: 0,
            });
          }
          const productStatRefund = productStats.get(productKey)!;
          // 商品维度：收入不变（0），利润累加负成本
          productStatRefund.totalProfit += -refundedCost;

          const categoryKey = groupBuy.product.productType.id;
          if (!categoryStats.has(categoryKey)) {
            categoryStats.set(categoryKey, {
              categoryId: groupBuy.product.productType.id,
              categoryName: groupBuy.product.productType.name,
              totalRevenue: 0,
              totalProfit: 0,
              orderCount: 0,
              productCount: 0,
              groupBuyCount: 0,
            });
          }
          const categoryStatRefund = categoryStats.get(categoryKey)!;
          // 分类维度：收入不变（0），利润累加负成本
          categoryStatRefund.totalProfit += -refundedCost;

          continue;
        }

        // 已支付/已完成：仅退款不退货；部分退款按绝对额冲减
        const orderRevenue = originalRevenue - partialRefundAmount;
        const orderProfit = originalProfit - partialRefundAmount;

        // 累加到总体统计中
        totalRevenue += orderRevenue;
        totalProfit += orderProfit;
        totalPartialRefundAmount += partialRefundAmount;
        totalOrderCount++;
        // 累加到当前团购单统计中
        groupBuyRevenue += orderRevenue;
        groupBuyProfit += orderProfit;
        groupBuyPartialRefundAmount += partialRefundAmount;
        groupBuyOrderCount++;

        // 添加客户ID到去重集合中
        uniqueCustomerIds.add(order.customerId);
        groupBuyCustomerIds.add(order.customerId);

        // 统计客户购买次数
        const currentCount = customerPurchaseCounts.get(order.customerId) || 0;
        customerPurchaseCounts.set(order.customerId, currentCount + 1);

        // 商品维度累计
        const productKey = groupBuy.product.id;
        if (!productStats.has(productKey)) {
          productStats.set(productKey, {
            productId: groupBuy.product.id,
            productName: groupBuy.product.name,
            categoryId: groupBuy.product.productType.id,
            categoryName: groupBuy.product.productType.name,
            totalRevenue: 0,
            totalProfit: 0,
            orderCount: 0,
            groupBuyCount: 0,
          });
        }
        const productStat = productStats.get(productKey)!;
        productStat.totalRevenue += orderRevenue;
        productStat.totalProfit += orderProfit;
        productStat.orderCount++;

        // 分类维度累计
        const categoryKey = groupBuy.product.productType.id;
        if (!categoryStats.has(categoryKey)) {
          categoryStats.set(categoryKey, {
            categoryId: groupBuy.product.productType.id,
            categoryName: groupBuy.product.productType.name,
            totalRevenue: 0,
            totalProfit: 0,
            orderCount: 0,
            productCount: 0,
            groupBuyCount: 0,
          });
        }
        const categoryStat = categoryStats.get(categoryKey)!;
        categoryStat.totalRevenue += orderRevenue;
        categoryStat.totalProfit += orderProfit;
        categoryStat.orderCount++;

        // 记录分类下出现过的商品ID（用于后续去重统计 productCount）
        if (!categoryProductIds.has(categoryKey)) {
          categoryProductIds.set(categoryKey, new Set<string>());
        }
        categoryProductIds.get(categoryKey)!.add(groupBuy.product.id);

        // 地域维度累计（以客户地址去重客户数）
        const addressId = order.customer.customerAddress?.id;
        const addressName = order.customer.customerAddress?.name || '未知地址';
        if (addressId) {
          if (!regionalStats.has(addressId)) {
            regionalStats.set(addressId, {
              addressId,
              addressName,
              customerIds: new Set<string>(),
            });
          }
          const regionalStat = regionalStats.get(addressId)!;
          regionalStat.customerIds.add(order.customerId);
        }
      }

      // 团购结束：计入对应商品/分类的团购次数（groupBuyCount）
      const productKey = groupBuy.product.id;
      const productStat = productStats.get(productKey);
      if (productStat) {
        productStat.groupBuyCount += 1;
      }
      const categoryKey = groupBuy.product.productType.id;
      const categoryStat = categoryStats.get(categoryKey);
      if (categoryStat) {
        categoryStat.groupBuyCount += 1;
      }

      // 组装团购历史项（用于详情页时间轴/列表展示）
      if (groupBuyOrderCount > 0) {
        groupBuyHistory.push({
          groupBuyId: groupBuy.id,
          groupBuyName: groupBuy.name,
          launchDate: groupBuy.groupBuyStartDate,
          orderCount: groupBuyOrderCount,
          revenue: groupBuyRevenue,
          profit: groupBuyProfit,
          partialRefundAmount: groupBuyPartialRefundAmount,
          customerCount: groupBuyCustomerIds.size,
          refundedOrderCount: await this.prisma.order.count({
            where: {
              delete: 0,
              status: OrderStatus.REFUNDED,
              groupBuyId: groupBuy.id,
              ...(startDate && endDate
                ? {
                    groupBuy: {
                      groupBuyStartDate: {
                        gte: startDate,
                        lte: endDate,
                      },
                    },
                  }
                : {}),
            },
          }),
        });
      }
    }

    // ================================================================
    // 步骤五：复购/多次购买客户统计
    // - repeat：购买次数>1 的客户
    // - 与上游 customerPurchaseCounts/uniqueCustomerIds 口径一致
    // ================================================================
    const customerOrderCounts = new Map<string, number>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const count = customerOrderCounts.get(order.customerId) || 0;
        customerOrderCounts.set(order.customerId, count + 1);
      }
    }
    for (const [customerId, count] of customerOrderCounts) {
      if (count > 1) {
        repeatCustomerIds.add(customerId);
      }
    }

    // ================================================================
    // 步骤六：多次购买客户指标汇总
    // - multiPurchaseCustomerCount：购买次数>1 的客户数量
    // - multiPurchaseCustomerRatio：占去重客户数比例（%）
    // - 说明：供上层概况/详情统一展示复购相关指标
    // ================================================================
    const multiPurchaseCustomerCount = repeatCustomerIds.size;
    const multiPurchaseCustomerRatio =
      uniqueCustomerIds.size > 0
        ? (multiPurchaseCustomerCount / uniqueCustomerIds.size) * 100
        : 0;

    // 步骤七：分类维度补充统计
    // - 已移除产品维度的客户数统计（保持口径单一）
    // - 分类维度下的商品数按“去重商品ID”计算
    for (const [categoryKey, stat] of categoryStats.entries()) {
      const ids = categoryProductIds.get(categoryKey);
      stat.productCount = ids ? ids.size : 0;
    }

    // 步骤八：派生总体指标
    // - 平均利润率/平均客单价/复购客户数与比例/团购数与均值
    const averageProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageCustomerOrderValue =
      uniqueCustomerIds.size > 0 ? totalRevenue / uniqueCustomerIds.size : 0;
    const repeatCustomerCount = repeatCustomerIds.size;
    const repeatCustomerRatio =
      uniqueCustomerIds.size > 0
        ? (repeatCustomerCount / uniqueCustomerIds.size) * 100
        : 0;
    const totalGroupBuyCount = groupBuysWithOrders.length;
    const averageGroupBuyRevenue =
      totalGroupBuyCount > 0 ? totalRevenue / totalGroupBuyCount : 0;

    // 步骤九：客户购买次数分布（用于频次分布图）
    const purchaseFrequencyMap = new Map<number, number>();
    for (const count of customerPurchaseCounts.values()) {
      const currentFreq = purchaseFrequencyMap.get(count) || 0;
      purchaseFrequencyMap.set(count, currentFreq + 1);
    }

    // 步骤十：基于“供货商团购数”动态分桶
    const buildBuckets = (
      gbCount: number,
    ): Array<{ min: number; max?: number | null }> => {
      if (gbCount >= 20) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: 9 },
          { min: 10, max: 19 },
          { min: 20, max: 39 },
          { min: 40, max: null },
        ];
      }
      if (gbCount >= 10) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: 9 },
          { min: 10, max: null },
        ];
      }
      if (gbCount >= 5) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: null },
        ];
      }
      const buckets: Array<{ min: number; max?: number | null }> = [];
      for (let i = 1; i <= Math.max(1, gbCount); i += 1) {
        buckets.push({ min: i, max: i });
      }
      return buckets;
    };

    const buckets = buildBuckets(totalGroupBuyCount);

    const customerPurchaseFrequency: CustomerPurchaseFrequency[] = buckets
      .map((bucket) => {
        const { min, max } = bucket;
        let sum = 0;
        for (const [
          purchaseCount,
          customerCount,
        ] of purchaseFrequencyMap.entries()) {
          if (max == null) {
            if (purchaseCount >= min) sum += customerCount;
          } else if (purchaseCount >= min && purchaseCount <= max) {
            sum += customerCount;
          }
        }
        return {
          minFrequency: min,
          maxFrequency: max ?? null,
          count: sum,
        };
      })
      .filter((b) => b.count > 0);

    // 步骤十一：列表维度排序与截取
    // - 商品：按销售额降序取 Top10
    // - 分类：按销售额降序排序（全部）
    // - 地域：按客户数降序排序
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const productCategoryStats = Array.from(categoryStats.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    const regionalSales: RegionalSalesItem[] = Array.from(
      regionalStats.values(),
    )
      .map((stat) => ({
        addressId: stat.addressId,
        addressName: stat.addressName,
        customerCount: stat.customerIds.size, // 使用Set的size属性获取去重后的客户数量
      }))
      .sort((a, b) => b.customerCount - a.customerCount);

    // 步骤十二：团购历史按发起时间降序
    groupBuyHistory.sort(
      (a, b) =>
        new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
    );

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      startDate,
      endDate,
      totalRevenue,
      totalProfit,
      totalPartialRefundAmount,
      averageProfitMargin,
      totalOrderCount,
      uniqueCustomerCount: uniqueCustomerIds.size,
      averageCustomerOrderValue,
      repeatCustomerCount,
      repeatCustomerRatio,
      customerPurchaseFrequency,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      totalGroupBuyCount,
      averageGroupBuyRevenue,
      topProducts,
      productCategoryStats,
      regionalSales,
      groupBuyHistory,
    };
  }

  /**
   * 获取供货商特定购买频次的客户列表（供货商维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计该供货商全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 频次：支持单值 frequency 或范围 [minFrequency, maxFrequency]。
   * 输出：符合频次条件的客户基本信息及其购买次数。
   */
  async getSupplierFrequencyCustomers(
    params: SupplierFrequencyCustomersParams,
  ): Promise<SupplierFrequencyCustomersResult> {
    // ================================================================
    // 1）构建时间过滤并拉取订单
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：按 groupBuyStartDate 过滤
    // - 字段：仅保留客户基本信息
    // ================================================================
    const {
      supplierId,
      frequency,
      minFrequency,
      maxFrequency,
      startDate,
      endDate,
    } = params;

    // 构建时间过滤条件
    const timeFilter =
      startDate && endDate
        ? {
            groupBuyStartDate: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    // 2) 查询指定供货商的团购及其订单
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        supplierId,
        delete: 0,
        ...timeFilter,
      },
      include: {
        order: {
          where: {
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
            delete: 0,
          },
          select: {
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 3) 统计每个客户的购买次数
    const customerPurchaseCounts = new Map<string, number>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerId = order.customerId;
        const currentCount = customerPurchaseCounts.get(customerId) || 0;
        customerPurchaseCounts.set(customerId, currentCount + 1);
      }
    }

    // 4) 应用频次过滤（单值或范围）并返回客户基本信息
    const minF = minFrequency ?? frequency ?? 0;
    const maxF = maxFrequency ?? frequency ?? Number.POSITIVE_INFINITY;

    const targetCustomers: CustomerBasicInfo[] = [];
    for (const [customerId, count] of customerPurchaseCounts.entries()) {
      if (count >= minF && count <= maxF) {
        // 查找客户信息（避免再次查询，直接从已拉取数据中取一次）
        for (const groupBuy of groupBuysWithOrders) {
          for (const order of groupBuy.order) {
            if (order.customerId === customerId) {
              targetCustomers.push({
                customerId: order.customer.id,
                customerName: order.customer.name,
                purchaseCount: count,
              });
              break; // 找到客户信息后跳出内层循环
            }
          }
          if (targetCustomers.some((c) => c.customerId === customerId)) {
            break; // 已添加该客户，跳出外层循环
          }
        }
      }
    }

    return {
      customers: targetCustomers,
    };
  }

  /**
   * 获取供货商特定区域的客户列表（供货商维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计该供货商全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 区域：依据订单关联客户的 addressId 进行过滤，客户去重返回。
   * 输出：指定地址下的去重客户列表。
   */
  async getSupplierRegionalCustomers(
    params: SupplierRegionalCustomersParams,
  ): Promise<SupplierRegionalCustomersResult> {
    // ================================================================
    // 步骤一：构建时间过滤并拉取订单
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：按 groupBuyStartDate 过滤
    // - 字段：仅保留客户与地址字段
    // ================================================================
    const { supplierId, addressId, startDate, endDate } = params;

    // 构建时间过滤条件
    const timeFilter =
      startDate && endDate
        ? {
            groupBuyStartDate: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    // 2) 查询指定供货商的团购及其订单
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        supplierId,
        delete: 0,
        ...timeFilter,
      },
      select: {
        order: {
          where: {
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
            delete: 0,
          },
          select: {
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
                customerAddressId: true,
              },
            },
          },
        },
      },
    });

    // 3) 筛选指定地址客户并去重
    const targetCustomers = new Map<string, CustomerBasicInfo>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        if (order.customer.customerAddressId === addressId) {
          const customerId = order.customerId;
          if (!targetCustomers.has(customerId)) {
            targetCustomers.set(customerId, {
              customerId: order.customer.id,
              customerName: order.customer.name,
            });
          }
        }
      }
    }

    return {
      customers: Array.from(targetCustomers.values()),
    };
  }
}
