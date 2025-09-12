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
  GroupBuyRankResult,
  CustomerRankResult,
  SupplierRankResult,
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
   * @description 统计指定日期范围内的团购和订单数据，包括总数、销售额、利润及每日趋势。
   * @param {AnalysisCountParams} data - 包含 startDate 和 endDate 的查询参数。
   * @returns {Promise<AnalysisCountResult>} 包含各项统计结果和趋势数据的 Promise。
   */
  async count(data: AnalysisCountParams): Promise<AnalysisCountResult> {
    // ================================================================
    // 金额精度统一处理
    // 说明：
    // - 所有与金额相关的计算（销售额、利润、部分退款）均在“每一步”做两位小数的舍入。
    // - 原因：JavaScript 的二进制浮点运算会产生 0.1 + 0.2 = 0.30000000000000004 之类的误差，
    //   若在流水累计、分桶聚合、累计趋势等多次相加过程中不及时规整，误差会被放大并出现在前端。
    // - 策略：采用 round2 对每笔订单的金额、每日累计、总计累计等节点统一保留两位小数，避免尾差。
    // - 若未来需要更严格的货币精度（如分单位或大数精度），可替换为十进制库（big.js/decimal.js）。
    // ================================================================
    const round2 = (value: number): number =>
      Math.round((value + Number.EPSILON) * 100) / 100;
    const { startDate, endDate } = data;

    // ================================================================
    // 1) 统计在指定日期范围内“发起”的团购总数（基于 groupBuyStartDate）
    // 说明：
    // - 若未传入 startDate/endDate，则视为统计全部历史数据。
    // - 所有统计均排除逻辑删除的数据（delete = 0）。
    // ================================================================
    // 如果没有提供时间参数，则查询全部数据
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
        delete: 0, // 确保只统计未删除的团购单
      },
    });

    // ================================================================
    // 2) 查询指定时间范围内“发起”的团购单及其订单（含已付/完成/退款）
    // 说明：
    // - 用于计算：订单总数、总销售额、总利润，以及每日趋势（团购数/订单数/销售额/利润）。
    // - 团购维度：按“团购发起日期”归档到每日（即趋势的横轴日期来自团购的发起日）。
    // - 订单维度：仅统计 delete=0，状态在 [PAID, COMPLETED, REFUNDED] 的订单。
    // - 金额口径：
    //   * 已退款订单：收入 0，利润 = -成本（视为损益扣减）。
    //   * 部分退款：收入、利润均减去部分退款金额。
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
            delete: 0, // 确保订单未被删除
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
    // 运行中累计指标（总量）
    // ------------------------------------------------
    let orderCount = 0; // 发起的订单总数（注：关联团购单在指定日期内发起）
    let totalPrice = 0; // 总销售额（两位小数）
    let totalProfit = 0; // 总利润（两位小数）

    // ------------------------------------------------
    // 用于构建每日趋势的映射（按“YYYY-MM-DD”当天聚合）
    // ------------------------------------------------
    const groupBuyTrendMap = new Map<string, number>();
    const orderTrendMap = new Map<string, number>();
    const priceTrendMap = new Map<string, number>();
    const profitTrendMap = new Map<string, number>();

    // ------------------------------------------------
    // 遍历团购单与其订单，累加总量，并按“团购发起日期”填充当日趋势
    // ------------------------------------------------
    for (const groupBuy of groupBuysWithOrders) {
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 统计每日“团购数”趋势：根据团购发起日期计数
      const groupBuyDate = dayjs(groupBuy.groupBuyStartDate).format(
        'YYYY-MM-DD',
      );
      groupBuyTrendMap.set(
        groupBuyDate,
        (groupBuyTrendMap.get(groupBuyDate) || 0) + 1,
      );

      // 遍历该团购下的订单：
      // - 累加订单总量
      // - 按发起日期统计订单趋势
      // - 计算金额（收入/利润），并填充销售额/利润的每日趋势
      for (const order of groupBuy.order as (SelectedOrder & {
        partialRefundAmount: number;
        status: OrderStatus;
      })[]) {
        // 步骤：订单计数
        // 口径：与团购发起日关联的订单总量，不剔除 REFUNDED（用于金额规则与趋势对齐）
        orderCount++; // 每找到一个订单就计数

        // 统计每日订单趋势：根据关联团购单的发起日期计数
        const orderDate = dayjs(groupBuy.groupBuyStartDate).format(
          'YYYY-MM-DD',
        );
        orderTrendMap.set(orderDate, (orderTrendMap.get(orderDate) || 0) + 1);

        // 根据订单的 unitId 查找对应的团购规格，计算销售额和利润
        // 步骤：通过 unitId 定位订单对应规格，用于金额计算
        const selectedUnit = units.find((unit) => unit.id === order.unitId);

        if (selectedUnit) {
          // 步骤：原始金额计算（未考虑退款）
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
          // 分支：根据订单状态应用退款口径
          if (order.status === OrderStatus.REFUNDED) {
            // 全额退款：收入为0，利润为-成本
            actualSalesAmount = 0;
            actualProfitAmount = -originalCostAmount;
          } else {
            // 部分退款：仅退款不退货
            const partial = round2(order.partialRefundAmount || 0);
            actualSalesAmount = round2(originalSalesAmount - partial);
            actualProfitAmount = round2(originalProfitAmount - partial);
          }

          totalPrice = round2(totalPrice + actualSalesAmount);
          totalProfit = round2(totalProfit + actualProfitAmount);

          // 映射更新：统计每日销售额趋势（按团购发起日）
          priceTrendMap.set(
            orderDate,
            round2((priceTrendMap.get(orderDate) || 0) + actualSalesAmount),
          );
          // 映射更新：统计每日利润趋势（按团购发起日）
          profitTrendMap.set(
            orderDate,
            round2((profitTrendMap.get(orderDate) || 0) + actualProfitAmount),
          );
        }
      }
    }

    // ================================================================
    // 3) 构建“每日”趋势序列
    // 说明：
    // - 若无时间范围（全部）：仅输出有数据的日期，并按日期升序排列。
    // - 若有时间范围：从 startDate 到 endDate 逐日填充，缺失日期补 0。
    // - 输出四条“每日趋势”序列：团购数、订单数、销售额、利润。
    // - 注意：此处仅构建“每日趋势”，不做分桶合并；分桶仅在“累计趋势”阶段处理。
    // ================================================================
    const groupBuyTrend: { date: Date; count: number }[] = [];
    const orderTrend: { date: Date; count: number }[] = [];
    const priceTrend: { date: Date; count: number }[] = [];
    const profitTrend: { date: Date; count: number }[] = [];

    // ------------------------------------------------
    // 对应的累计趋势序列（稍后将基于“每日序列”做分桶聚合后再累计）
    // ------------------------------------------------
    const cumulativeGroupBuyTrend: { date: Date; count: number }[] = [];
    const cumulativeOrderTrend: { date: Date; count: number }[] = [];
    const cumulativePriceTrend: { date: Date; count: number }[] = [];
    const cumulativeProfitTrend: { date: Date; count: number }[] = [];

    // 如果没有提供时间参数，则只返回有数据的日期
    if (!startDate || !endDate) {
      // 收集所有有数据的日期
      const allDates = new Set<string>();
      groupBuyTrendMap.forEach((_, date) => allDates.add(date));
      orderTrendMap.forEach((_, date) => allDates.add(date));
      priceTrendMap.forEach((_, date) => allDates.add(date));
      profitTrendMap.forEach((_, date) => allDates.add(date));

      // 按日期排序并生成趋势数据
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
        // 步骤：推入“每日趋势”四条序列
        groupBuyTrend.push({ date, count: gb });
        orderTrend.push({ date, count: od });
        priceTrend.push({ date, count: pr });
        profitTrend.push({ date, count: pf });

        // 步骤：计算“累计趋势”（逐日累加）；金额统一 round2
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
      // 遍历从 startDate 到 endDate 的每一天，填充趋势数据
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
        // 步骤：按天补零，确保横轴连续
        groupBuyTrend.push({ date: currentDate.toDate(), count: gb });
        orderTrend.push({ date: currentDate.toDate(), count: od });
        priceTrend.push({ date: currentDate.toDate(), count: pr });
        profitTrend.push({ date: currentDate.toDate(), count: pf });

        // 步骤：同步构建累计曲线（逐日累加）
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
    // 4) 动态聚合（仅用于累计趋势）
    // 说明：
    // - 问题：当日期跨度较大（数百天），若横轴逐日渲染，点位过多影响阅读与性能。
    // - 策略：仅对“累计趋势”进行分桶聚合（每日趋势保持原始粒度，便于观察每日波动）。
    // - 分桶规则：依据起止日期差动态选择桶大小（1/3/7/14/30 天）。
    // - 聚合原则：
    //   * 同一桶内的每日数量做“求和”。
    //   * 该桶的日期取桶内“最后一天”，以贴近该段终点。
    //   * 聚合完成后，再基于聚合后的序列重建累计曲线。
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
      if (bucketSize <= 1 || series.length === 0) return series;
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
        // 分桶：同一桶内做求和聚合
        const prev = bucketIndexToSum.get(bucketIndex) || 0;
        bucketIndexToSum.set(bucketIndex, round2(prev + item.count));
        // 使用分桶内的最后一天用于图表展示（更贴近该段的终点）
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
    // 基于聚合后的“每日序列”重建累计曲线
    // ------------------------------------------------
    const rebuildCumulative = (series: { date: Date; count: number }[]) => {
      const res: { date: Date; count: number }[] = [];
      let acc = 0;
      for (const item of series) {
        // 步骤：顺序累计，金额两位小数
        acc = round2(acc + item.count);
        res.push({ date: item.date, count: acc });
      }
      return res;
    };

    // ------------------------------------------------
    // 计算原始序列的第一天与最后一天（用于选择分桶大小）
    // 注：若四条每日序列均为空，则不做分桶。
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
    // 5) 返回所有统计结果
    // 说明：
    // - 每日趋势：保持原始逐日粒度（用于未勾选“累计趋势”的场景）。
    // - 累计趋势：使用分桶后的序列重建（用于勾选“累计趋势”，降低横轴点位）。
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
   * 获取团购单排行数据
   */
  async getGroupBuyRank(
    params: AnalysisCountParams,
  ): Promise<GroupBuyRankResult> {
    // ================================================================
    // 接口：获取团购单排行（按团购维度聚合）
    // 目标：返回三类排行榜（订单量、销售额、利润），各取 Top10
    // 时间口径：按“团购发起时间”过滤（groupBuyStartDate）
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED, REFUNDED]
    // 金额口径：
    //   - 已退款订单：收入=0，利润=-成本
    //   - 部分退款：收入、利润均减去部分退款金额
    // 流程：
    //   1) 拉取指定时间内的团购单及订单
    //   2) 计算每个团购单的 totalSales/totalProfit/orderCount
    //   3) 按不同指标排序取前10，组装返回
    // 精度：沿用 round2 逻辑，保证金额两位小数
    // ================================================================
    const { startDate, endDate } = params;

    // 获取指定时间范围内的团购单及其关联订单
    // 步骤：拉取团购及订单（按发起时间过滤）
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
            partialRefundAmount: true,
            status: true,
          },
        },
      },
    });

    // 计算每个团购单的统计数据
    // 步骤：按团购维度累加金额与订单
    const groupBuysWithStats = groupBuysWithOrders.map((gb) => {
      let totalSales = 0;
      let totalProfit = 0;
      const units = gb.units as Array<GroupBuyUnit>;

      for (const order of gb.order as Array<{
        quantity: number;
        unitId: string;
        partialRefundAmount: number;
        status: OrderStatus;
      }>) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          // 原始金额计算
          const originalSale = selectedUnit.price * order.quantity;
          const originalProfit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCost = selectedUnit.costPrice * order.quantity;

          let actualSale = 0;
          let actualProfit = 0;
          // 分支：退款/部分退款规则
          if (order.status === OrderStatus.REFUNDED) {
            actualSale = 0;
            actualProfit = -originalCost;
          } else {
            const partial = order.partialRefundAmount || 0;
            actualSale = originalSale - partial;
            actualProfit = originalProfit - partial;
          }

          // 汇总：团购维度累计
          totalSales += actualSale;
          totalProfit += actualProfit;
        }
      }

      return {
        id: gb.id,
        name: gb.name,
        // 指标：订单量不计 REFUNDED
        orderCount: gb.order.filter((o) => o.status !== OrderStatus.REFUNDED)
          .length,
        totalSales,
        totalProfit,
        groupBuyStartDate: gb.groupBuyStartDate,
      };
    });

    // 排序取 Top10：订单量/销售额/利润
    const groupBuyRankByOrderCount = [...groupBuysWithStats]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);
    const groupBuyRankByTotalSales = [...groupBuysWithStats]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
    const groupBuyRankByTotalProfit = [...groupBuysWithStats]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    return {
      groupBuyRankByOrderCount,
      groupBuyRankByTotalSales,
      groupBuyRankByTotalProfit,
    };
  }

  /**
   * 获取客户排行数据
   */
  async getCustomerRank(
    params: AnalysisCountParams,
  ): Promise<CustomerRankResult> {
    // ================================================================
    // 接口：获取客户排行（按客户维度聚合）
    // 目标：返回三类排行榜（订单量、总消费额、平均订单额），各取 Top10
    // 时间口径：按团购发起时间过滤
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED]
    // 金额口径：订单金额 = 单价*数量 - 部分退款
    // 流程：
    //   1) 取订单（含客户信息、团购规格）
    //   2) 按客户聚合：订单量、总消费额
    //   3) 派生平均订单额 = 总消费额/订单量
    //   4) 各维度排序取 Top10
    // ================================================================
    const { startDate, endDate } = params;

    // 获取指定时间范围内的订单及其关联客户信息
    // 根据团购发起时间进行过滤，而不是订单创建时间
    // 步骤：获取订单（限制状态，按团购发起时间过滤）
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
        partialRefundAmount: true, // 添加部分退款金额字段
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

    // 按客户合并订单数据
    // 映射构建：按客户ID聚合订单量与消费额
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

      // 金额计算：单价*数量 - 部分退款
      let orderAmount = 0;
      const selectedUnit = units.find((unit) => unit.id === order.unitId);
      if (selectedUnit) {
        const originalAmount = selectedUnit.price * order.quantity;
        orderAmount = originalAmount - (order.partialRefundAmount || 0);
      }

      // 映射更新：累计客户的订单量与总消费额
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

    // 派生指标：平均订单额 = 总消费额 / 订单量
    const customersArray = Array.from(customerData.values()).map(
      (customer) => ({
        ...customer,
        averageOrderAmount:
          customer.orderCount > 0
            ? customer.totalAmount / customer.orderCount
            : 0,
      }),
    );

    // 排序取 Top10：订单量/总消费额/平均订单额
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
   * 获取供货商排行数据
   */
  async getSupplierRank(
    params: AnalysisCountParams,
  ): Promise<SupplierRankResult> {
    // ================================================================
    // 接口：获取供货商排行（按供货商维度聚合）
    // 目标：返回三类排行榜（订单量、总销售额、总利润），各取 Top10
    // 时间口径：按团购发起时间过滤
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED, REFUNDED]
    // 金额口径：同上（退款=负成本，部分退款直减）
    // 流程：
    //   1) 拉取供货商相关团购及其订单
    //   2) 按供货商聚合：订单量、销售额、利润
    //   3) 生成三类排行榜并返回
    // ================================================================
    const { startDate, endDate } = params;

    // 获取指定时间范围内的团购单及其关联订单和供应商信息
    // 步骤：获取团购及订单与供应商信息
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
            partialRefundAmount: true,
            status: true,
          },
        },
      },
    });

    // 按供应商合并数据
    // 映射构建：按供应商ID聚合指标
    const supplierData = new Map<
      string,
      {
        id: string;
        name: string;
        orderCount: number;
        totalSales: number;
        totalProfit: number;
      }
    >();

    for (const gb of groupBuysWithOrders) {
      if (!gb.supplier) continue;

      const supplierId = gb.supplier.id;
      const supplierName = gb.supplier.name;
      const units = gb.units as Array<GroupBuyUnit>;

      let totalSales = 0;
      let totalProfit = 0;
      const orderCount = gb.order.length; // 订单条数（含退款，用于一致性排序口径）

      for (const order of gb.order as Array<{
        quantity: number;
        unitId: string;
        partialRefundAmount: number;
        status: OrderStatus;
      }>) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          // 原始金额
          const originalSale = selectedUnit.price * order.quantity;
          const originalProfit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCost = selectedUnit.costPrice * order.quantity;

          let actualSale = 0;
          let actualProfit = 0;
          // 分支：退款/部分退款
          if (order.status === OrderStatus.REFUNDED) {
            actualSale = 0;
            actualProfit = -originalCost;
          } else {
            const partial = order.partialRefundAmount || 0;
            actualSale = originalSale - partial;
            actualProfit = originalProfit - partial;
          }

          // 汇总：供应商维度累计
          totalSales += actualSale;
          totalProfit += actualProfit;
        }
      }

      if (supplierData.has(supplierId)) {
        const existing = supplierData.get(supplierId)!;
        existing.orderCount += orderCount;
        existing.totalSales += totalSales;
        existing.totalProfit += totalProfit;
      } else {
        supplierData.set(supplierId, {
          id: supplierId,
          name: supplierName,
          orderCount,
          totalSales,
          totalProfit,
        });
      }
    }

    const suppliersArray = Array.from(supplierData.values());

    // 排序取 Top10：订单量/销售额/利润
    const supplierRankByOrderCount = [...suppliersArray]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);
    const supplierRankByTotalSales = [...suppliersArray]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
    const supplierRankByTotalProfit = [...suppliersArray]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    return {
      supplierRankByOrderCount,
      supplierRankByTotalSales,
      supplierRankByTotalProfit,
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
    // 目标：将同名团购按供货商ID合并，统计销售额、利润、订单量、客户数等，并支持分页排序
    // 过滤：delete=0；可选 groupBuyName 模糊、supplierIds 精确、时间范围 groupBuyStartDate
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED, REFUNDED]
    // 指标说明：
    //   - totalRevenue/totalProfit：含退款口径（退款=负成本，部分退款直减）
    //   - totalOrderCount：仅计 PAID/COMPLETED
    //   - uniqueCustomerCount：去重客户数
    //   - totalProfitMargin：totalProfit/totalRevenue * 100
    //   - averageCustomerOrderValue：totalRevenue/uniqueCustomerCount
    // 排序：支持多字段（默认为 totalRevenue），并分页返回
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
    } = params;

    // 1. 构建查询条件
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
      // 如果提供了时间参数，则添加时间过滤条件
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2. 获取指定时间范围内的所有团购单及其订单数据
    // 步骤：获取团购单 + 供应商 + 订单（限制状态）
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

    // 2. 按团购单名称和供货商ID进行分组聚合
    // 映射构建：以“团购名称|供应商ID”为唯一键聚合
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
      }
    >();

    // 遍历所有团购单，按名称和供货商ID聚合数据
    for (const groupBuy of groupBuysWithOrders) {
      const groupBuyName = groupBuy.name;
      const supplierId = groupBuy.supplierId;
      const supplierName = groupBuy.supplier?.name || '未知供货商';
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 生成唯一键：团购名称 + 供货商ID
      const uniqueKey = `${groupBuyName}|${supplierId}`;

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
        });
      }

      const mergedData = mergedDataMap.get(uniqueKey)!;

      // 遍历订单：累加金额、订单量、客户去重、数量
      for (const order of groupBuy.order as Array<{
        quantity: number;
        unitId: string;
        customerId: string;
        partialRefundAmount?: number;
        status: OrderStatus;
      }>) {
        // 根据unitId找到对应的规格信息
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          // 原始金额
          const originalRevenue = selectedUnit.price * order.quantity;
          const originalProfit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCost = selectedUnit.costPrice * order.quantity;
          const partialRefundAmount = order.partialRefundAmount || 0;

          // 分支：退款/部分退款
          const revenue =
            order.status === OrderStatus.REFUNDED
              ? 0
              : originalRevenue - partialRefundAmount;
          const profit =
            order.status === OrderStatus.REFUNDED
              ? -originalCost
              : originalProfit - partialRefundAmount;
          // 映射更新：金额口径
          mergedData.totalRevenue += revenue;
          mergedData.totalProfit += profit;
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            // 指标：订单量仅计 PAID/COMPLETED
            mergedData.totalOrderCount += 1;
          }
          // 客户去重：加入集合
          mergedData.uniqueCustomerIds.add(order.customerId);
          // 数量汇总：总购买数量
          mergedData.totalQuantity += order.quantity;
        }
      }
    }

    // 3. 转换为数组并计算派生指标
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
      };
    });

    // 4. 根据指定字段和排序方式进行排序
    // 排序：根据字段与方向
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

    // 5. 分页处理
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
    // 步骤：获取目标团购（包含产品、供应商、订单、客户地址）
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
    // 聚合容器：核心业绩、客户、地域
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

      // 收集供货商名称（用于详情抬头展示）
      if (groupBuy.supplier && groupBuy.supplier.name) {
        supplierNamesSet.add(groupBuy.supplier.name);
      }

      // 遍历当前团购单的所有订单
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

            // 累加：合计金额与部分退款
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
            // 客户去重
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
    // - >=20: 1,2,3,4, 5-9, 10-19, 20+
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
          { min: 20, max: null },
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
    // 历史记录：逐次团购的订单/金额/退款统计
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
   * 获取特定购买频次的客户列表
   */
  async getMergedGroupBuyFrequencyCustomers(
    params: MergedGroupBuyFrequencyCustomersParams,
  ): Promise<MergedGroupBuyFrequencyCustomersResult> {
    // ================================================================
    // 接口：获取特定购买频次的客户列表（团购合并维度）
    // 目标：在某团购名称 + 供货商 + 可选时间范围内，筛选购买次数在指定频次/范围内的客户
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED]
    // 逻辑：
    //   1) 取订单并按客户计数
    //   2) 应用 frequency 或 (minFrequency, maxFrequency) 过滤
    //   3) 返回客户基本信息及其购买次数（purchaseCount）
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

    // 2. 查询指定名称的团购单及其订单数据
    // 步骤：目标团购订单（仅已付/完成）
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

    // 3. 统计每个客户的购买次数
    // 映射构建：客户->购买次数
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

    // 4. 筛选出指定购买频次（或范围）的客户
    const minF = minFrequency ?? frequency ?? 0;
    const maxF = maxFrequency ?? frequency ?? Number.POSITIVE_INFINITY;

    // 筛选：固定频次或范围[minF, maxF]
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
   * 获取特定区域的客户列表
   */
  async getMergedGroupBuyRegionalCustomers(
    params: MergedGroupBuyRegionalCustomersParams,
  ): Promise<MergedGroupBuyRegionalCustomersResult> {
    // ================================================================
    // 接口：获取特定区域的客户列表（团购合并维度）
    // 目标：在某团购名称 + 供货商 + 可选时间范围内，筛选出属于指定地址的客户（去重）
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED]
    // 流程：
    //   1) 拉取订单，过滤地址ID
    //   2) 客户去重后返回客户列表，并补充地址名称
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

    // 2. 查询指定名称的团购单及其订单数据
    // 步骤：目标团购订单（仅已付/完成），含客户地址
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

    // 3. 筛选出指定区域的客户
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

    // 获取地址名称
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
    // 目标：聚合供货商在指定时间范围内的业绩指标，支持搜索、排序与分页
    // 过滤：供应商 delete=0；团购 delete=0；时间范围按 groupBuyStartDate
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED, REFUNDED]
    // 指标：总销售额、总利润、总订单量、参与客户数、团购单数、平均利润率
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

    // 1. 构建供货商查询条件
    // 基础条件：只查询未删除的供货商
    // 可选条件：按供货商名称模糊搜索
    const whereCondition = {
      delete: 0, // 只查询未删除的供货商
      ...(supplierName && {
        name: {
          contains: supplierName, // 按供货商名称模糊匹配
        },
      }),
    };

    // 2. 获取所有供货商及其团购单和订单数据
    // 查询策略：一次性获取所有需要的数据，避免N+1查询问题
    // 包含关系：供货商 -> 团购单 -> 订单
    // 步骤：获取供应商 -> 团购 -> 订单
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

    // 3. 计算每个供货商的统计数据
    // 遍历每个供货商，聚合其所有团购单和订单的数据
    const supplierStats: SupplierOverviewListItem[] = [];

    for (const supplier of suppliersWithData) {
      // 初始化数据结构和统计变量
      const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息，用于计算价格和利润
      const uniqueCustomerIds = new Set<string>(); // 去重客户ID，用于统计参与客户数
      let totalRevenue = 0; // 总销售额
      let totalProfit = 0; // 总利润
      let totalOrderCount = 0; // 总订单量

      // 遍历该供货商的所有团购单
      for (const groupBuy of supplier.groupBuy) {
        const groupBuyUnits = groupBuy.units as Array<GroupBuyUnit>;

        // 将团购单的规格信息添加到units Map中
        // 规格信息包含价格和成本价，用于计算销售额和利润
        for (const unit of groupBuyUnits) {
          units.set(unit.id, unit);
        }

        // 遍历该团购单的所有订单，计算各项统计数据
        for (const order of groupBuy.order) {
          const unit = units.get(order.unitId);
          if (unit) {
            // 仅退款不退货规则
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

            // 累加到供货商总统计中
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

      // 计算平均利润率：总利润 / 总销售额 × 100%
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

    // 4. 排序处理
    // 根据指定的排序字段和排序方向对供货商列表进行排序
    // 排序：根据指定字段
    supplierStats.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      // 根据排序字段获取对应的数值进行比较
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

      // 根据排序方向返回比较结果
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // 5. 分页处理
    // 计算分页的起始和结束索引，返回指定页的数据
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
   * 获取供货商概况详情数据
   * 获取特定供货商的详细统计分析数据，用于供货商详情页面展示
   *
   * @param params 查询参数，包含供货商ID和时间范围
   * @returns 供货商详情数据，包含多维度分析结果
   *
   * 分析维度：
   * - 核心业绩指标：销售额、利润、利润率、订单量等
   * - 客户分析：参与客户数、平均客单价、复购客户分析
   * - 团购分析：团购单数、平均团购表现
   * - 产品分析：热销产品排行、产品分类统计
   * - 地域分析：不同地区的销售分布
   * - 团购历史：详细的团购发起记录
   */
  async getSupplierOverviewDetail(
    params: SupplierOverviewDetailParams,
  ): Promise<SupplierOverviewDetail> {
    // ================================================================
    // 接口：供货商概况详情（按供货商维度）
    // 目标：输出该供货商在时间范围内的多维度分析（业绩、客户、产品、分类、地域、历史等）
    // 过滤：团购 delete=0；可选时间范围 groupBuyStartDate
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED, REFUNDED]
    // 指标口径：与合并团购/排行榜保持一致（退款=负成本，部分退款直减；订单量仅计已付/完成）
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

    // 2. 获取供货商的所有团购单及其订单数据
    // 查询策略：一次性获取所有需要的数据，包含产品、分类、客户、地址等关联信息
    // 包含关系：团购单 -> 产品 -> 产品分类，团购单 -> 订单 -> 客户 -> 客户地址
    // 步骤：获取供货商的团购 + 产品/分类 + 订单/客户/地址
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

    // 3. 初始化统计数据结构和变量
    // 使用Map和Set进行高效的数据聚合和去重操作
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

    // 4. 遍历所有团购单，计算统计数据
    // 对每个团购单进行详细分析，计算各项统计指标
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
          // 全额退款：收入为0，利润为-成本；不计入订单量及客户/地域统计
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
          // revenue 加 0；利润计入负成本
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
          categoryStatRefund.totalProfit += -refundedCost;

          continue;
        }

        // 已支付/已完成：仅退款不退货，部分退款按绝对额扣利润
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

        // 统计商品数据（供货商-产品维度）
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

        // 统计分类数据（供货商-分类维度）
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

        // 记录分类下出现过的商品ID（用于去重统计商品数量）
        if (!categoryProductIds.has(categoryKey)) {
          categoryProductIds.set(categoryKey, new Set<string>());
        }
        categoryProductIds.get(categoryKey)!.add(groupBuy.product.id);

        // 统计地域数据（供货商-地址维度，客户去重）
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

      // 该团购单结束后，将其计入对应产品与分类的团购单数量
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

      // 添加团购历史记录（仅统计已付/完成订单口径）
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

    // 5. 计算复购客户和多次购买客户统计
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

    // 6. 多次购买客户指标（保留供概况统计使用）
    const multiPurchaseCustomerCount = repeatCustomerIds.size;
    const multiPurchaseCustomerRatio =
      uniqueCustomerIds.size > 0
        ? (multiPurchaseCustomerCount / uniqueCustomerIds.size) * 100
        : 0;

    // 7. 取消产品统计中的客户数计算（已移除 customerCount 字段）
    // 8. 计算分类统计中的商品数（同一商品ID只计算一次）
    for (const [categoryKey, stat] of categoryStats.entries()) {
      const ids = categoryProductIds.get(categoryKey);
      stat.productCount = ids ? ids.size : 0;
    }

    // 9. 计算各种比率和平均值
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

    // 9. 计算客户购买次数分布统计
    const purchaseFrequencyMap = new Map<number, number>();
    for (const count of customerPurchaseCounts.values()) {
      const currentFreq = purchaseFrequencyMap.get(count) || 0;
      purchaseFrequencyMap.set(count, currentFreq + 1);
    }

    // 根据团购单数量动态规划分桶（使用供货商的团购单数）
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
          { min: 20, max: null },
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

    // 10. 排序和限制数量
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

    // 按时间排序团购历史
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
   * 获取供货商特定购买频次的客户列表
   * 查询指定供货商下特定购买频次的客户信息
   *
   * @param params 查询参数，包含供货商ID、购买频次和时间范围
   * @returns 客户基本信息列表
   */
  async getSupplierFrequencyCustomers(
    params: SupplierFrequencyCustomersParams,
  ): Promise<SupplierFrequencyCustomersResult> {
    // ================================================================
    // 接口：供货商维度获取特定购买频次客户列表
    // 目标：在某供货商 + 可选时间范围内，筛选出购买次数在指定频次/范围内的客户
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED]
    // 流程：
    //   1) 拉取订单
    //   2) 按客户聚合购买次数
    //   3) 按范围过滤并返回客户列表
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

    // 查询指定供货商的所有团购单及其订单
    // 步骤：供货商团购订单（仅已付/完成）
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

    // 统计每个客户的购买次数
    // 映射构建：客户->购买次数
    const customerPurchaseCounts = new Map<string, number>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerId = order.customerId;
        const currentCount = customerPurchaseCounts.get(customerId) || 0;
        customerPurchaseCounts.set(customerId, currentCount + 1);
      }
    }

    // 筛选出购买次数在范围内的客户
    const minF = minFrequency ?? frequency ?? 0;
    const maxF = maxFrequency ?? frequency ?? Number.POSITIVE_INFINITY;

    const targetCustomers: CustomerBasicInfo[] = [];
    for (const [customerId, count] of customerPurchaseCounts.entries()) {
      if (count >= minF && count <= maxF) {
        // 查找客户信息
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
            break; // 如果已经添加了这个客户，跳出外层循环
          }
        }
      }
    }

    return {
      customers: targetCustomers,
    };
  }

  /**
   * 获取供货商特定区域的客户列表
   * 查询指定供货商下特定地址的客户信息
   *
   * @param params 查询参数，包含供货商ID、地址ID和时间范围
   * @returns 客户基本信息列表
   */
  async getSupplierRegionalCustomers(
    params: SupplierRegionalCustomersParams,
  ): Promise<SupplierRegionalCustomersResult> {
    // ================================================================
    // 接口：供货商维度获取特定区域客户列表
    // 目标：在某供货商 + 可选时间范围内，筛选属于指定地址的客户（去重）
    // 订单口径：delete=0 且状态在 [PAID, COMPLETED]
    // 流程：拉取订单 -> 过滤地址 -> 客户去重 -> 返回客户列表
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

    // 查询指定供货商的所有团购单及其订单
    // 步骤：供货商团购订单（仅已付/完成）+ 客户地址
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

    // 筛选出指定地址的客户（去重）
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
