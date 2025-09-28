// src/analysis/analysis.service.ts
import { Injectable } from '@nestjs/common';
import dayjs from '../../utils/dayjs'; // 集中管理的 dayjs 实例
import { OrderStatus } from '@prisma/client';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  AnalysisCountParams,
  AnalysisCountResult,
  GroupBuyUnit,
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
    // - totalRefundAmount：总退款金额（部分退款+全额退款）
    // - totalRefundedOrderCount：全额退款订单数
    // - totalPartialRefundOrderCount：部分退款订单数
    // ------------------------------------------------
    let orderCount = 0; // 发起的订单总数（注：关联团购单在指定日期内发起）
    let totalPrice = 0; // 总销售额（两位小数）
    let totalProfit = 0; // 总利润（两位小数）
    let totalRefundAmount = 0; // 总退款金额
    let totalRefundedOrderCount = 0; // 全额退款订单数
    let totalPartialRefundOrderCount = 0; // 部分退款订单数

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
      // - 订单量与订单趋势：仅计 PAID/COMPLETED（按团购发起日归档）
      // - 金额口径：退款订单销售额=0、利润=-成本；部分退款按绝对额冲减
      // - 无论金额口径如何，趋势中的金额按上述规则累计
      for (const order of groupBuy.order as (SelectedOrder & {
        partialRefundAmount: number;
        status: OrderStatus;
      })[]) {
        const orderDate = dayjs(groupBuy.groupBuyStartDate).format(
          'YYYY-MM-DD',
        );
        // 订单量与订单趋势仅计入已支付/已完成
        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.COMPLETED
        ) {
          orderCount++;
          orderTrendMap.set(orderDate, (orderTrendMap.get(orderDate) || 0) + 1);
        }

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
            totalRefundAmount = round2(totalRefundAmount + originalSalesAmount);
            totalRefundedOrderCount += 1;
          } else {
            // 部分退款口径：退款金额同时冲减销售额与利润
            const partial = round2(order.partialRefundAmount || 0);
            actualSalesAmount = round2(originalSalesAmount - partial);
            actualProfitAmount = round2(originalProfitAmount - partial);
            totalRefundAmount = round2(totalRefundAmount + partial);
            if (partial > 0) totalPartialRefundOrderCount += 1;
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

    // 统一：从映射生成每日与累计序列（内部方法，不导出）
    const buildDailyAndCumulative = (
      maps: {
        groupBuy: Map<string, number>;
        order: Map<string, number>;
        price: Map<string, number>;
        profit: Map<string, number>;
      },
      start?: Date,
      end?: Date,
    ) => {
      const daily = {
        groupBuy: [] as { date: Date; count: number }[],
        order: [] as { date: Date; count: number }[],
        price: [] as { date: Date; count: number }[],
        profit: [] as { date: Date; count: number }[],
      };
      const cumulative = {
        groupBuy: [] as { date: Date; count: number }[],
        order: [] as { date: Date; count: number }[],
        price: [] as { date: Date; count: number }[],
        profit: [] as { date: Date; count: number }[],
      };

      let cursor: import('dayjs').Dayjs | null = null;
      let endDay: import('dayjs').Dayjs | null = null;

      if (!start || !end) {
        // 无范围：以数据实际最早/最晚日补齐
        const all = new Set<string>();
        maps.groupBuy.forEach((_, d) => all.add(d));
        maps.order.forEach((_, d) => all.add(d));
        maps.price.forEach((_, d) => all.add(d));
        maps.profit.forEach((_, d) => all.add(d));
        if (all.size === 0) return { daily, cumulative };
        const sorted = Array.from(all).sort();
        cursor = dayjs(sorted[0]).startOf('day');
        endDay = dayjs(sorted[sorted.length - 1]).startOf('day');
      } else {
        cursor = dayjs(start).startOf('day');
        endDay = dayjs(end).startOf('day');
      }

      let accGB = 0;
      let accOD = 0;
      let accPR = 0;
      let accPF = 0;

      while (cursor && endDay && cursor.isSameOrBefore(endDay, 'day')) {
        const key = cursor.format('YYYY-MM-DD');
        const gb = maps.groupBuy.get(key) || 0;
        const od = maps.order.get(key) || 0;
        const pr = round2(maps.price.get(key) || 0);
        const pf = round2(maps.profit.get(key) || 0);
        const date = cursor.toDate();

        daily.groupBuy.push({ date, count: gb });
        daily.order.push({ date, count: od });
        daily.price.push({ date, count: pr });
        daily.profit.push({ date, count: pf });

        accGB += gb;
        accOD += od;
        accPR = round2(accPR + pr);
        accPF = round2(accPF + pf);
        cumulative.groupBuy.push({ date, count: accGB });
        cumulative.order.push({ date, count: accOD });
        cumulative.price.push({ date, count: accPR });
        cumulative.profit.push({ date, count: accPF });

        cursor = cursor.add(1, 'day');
      }

      return { daily, cumulative };
    };

    const { daily, cumulative } = buildDailyAndCumulative(
      {
        groupBuy: groupBuyTrendMap,
        order: orderTrendMap,
        price: priceTrendMap,
        profit: profitTrendMap,
      },
      startDate,
      endDate,
    );

    const groupBuyTrend: { date: Date; count: number }[] = daily.groupBuy;
    const orderTrend: { date: Date; count: number }[] = daily.order;
    const priceTrend: { date: Date; count: number }[] = daily.price;
    const profitTrend: { date: Date; count: number }[] = daily.profit;

    // 原始累计序列已体现在 dailySeries 上，cumulative 仅用于中间校验，避免未使用告警：
    void cumulative;

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
    ): {
      date: Date;
      count: number;
      startDate?: Date;
      endDate?: Date;
    }[] => {
      if (bucketSize <= 1 || series.length === 0) return series; // 桶大小为1或序列为空时，直接返回
      const sorted = [...series].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      const firstDate = dayjs(sorted[0].date).startOf('day');
      const bucketIndexToSum = new Map<number, number>();
      const bucketIndexToLastDate = new Map<number, Date>();
      const bucketIndexToFirstDate = new Map<number, Date>();
      for (const item of sorted) {
        const daysSinceStart = dayjs(item.date)
          .startOf('day')
          .diff(firstDate, 'day');
        const bucketIndex = Math.floor(daysSinceStart / bucketSize);
        const prev = bucketIndexToSum.get(bucketIndex) || 0;
        bucketIndexToSum.set(bucketIndex, round2(prev + item.count));
        // 保留桶内首尾日期，作为区间边界
        const currentDay = dayjs(item.date).startOf('day');
        const candidateEnd = currentDay.toDate();
        const candidateStart = currentDay.toDate();
        if (!bucketIndexToFirstDate.get(bucketIndex)) {
          bucketIndexToFirstDate.set(bucketIndex, candidateStart);
        }
        const existing = bucketIndexToLastDate.get(bucketIndex);
        if (!existing || dayjs(candidateEnd).isAfter(existing)) {
          bucketIndexToLastDate.set(bucketIndex, candidateEnd);
        }
      }
      const result: {
        date: Date;
        count: number;
        startDate?: Date;
        endDate?: Date;
      }[] = [];
      const indices = Array.from(bucketIndexToSum.keys()).sort((a, b) => a - b);
      for (const idx of indices) {
        result.push({
          date: bucketIndexToLastDate.get(idx)!,
          count: bucketIndexToSum.get(idx) || 0,
          startDate: bucketIndexToFirstDate.get(idx),
          endDate: bucketIndexToLastDate.get(idx),
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
    // 步骤四：生成按月统计趋势数据
    // - 基于原始每日数据按月聚合
    // - 用于前端"按月统计"展示
    // ================================================================
    const aggregateByMonth = (
      series: { date: Date; count: number }[],
    ): { date: Date; count: number }[] => {
      if (series.length === 0) return [];

      const monthlyMap = new Map<string, number>();

      for (const item of series) {
        const monthKey = dayjs(item.date).format('YYYY-MM');
        const current = monthlyMap.get(monthKey) || 0;
        monthlyMap.set(monthKey, round2(current + item.count));
      }

      // 找到最早和最晚的月份，填充缺失的月份
      const monthKeys = Array.from(monthlyMap.keys()).sort();
      if (monthKeys.length === 0) return [];

      const earliestMonth = dayjs(monthKeys[0] + '-01').startOf('month');
      const latestMonth = dayjs(
        monthKeys[monthKeys.length - 1] + '-01',
      ).startOf('month');

      const result: { date: Date; count: number }[] = [];
      let currentMonth = earliestMonth;

      while (currentMonth.isSameOrBefore(latestMonth, 'month')) {
        const monthKey = currentMonth.format('YYYY-MM');
        const count = monthlyMap.get(monthKey) || 0;

        result.push({
          date: currentMonth.toDate(), // 使用每月第一天作为日期
          count,
        });

        currentMonth = currentMonth.add(1, 'month');
      }

      return result;
    };

    const monthlyGroupBuyTrend = aggregateByMonth(groupBuyTrend);
    const monthlyOrderTrend = aggregateByMonth(orderTrend);
    const monthlyPriceTrend = aggregateByMonth(priceTrend);
    const monthlyProfitTrend = aggregateByMonth(profitTrend);

    // ================================================================
    // 步骤五：返回结果（保持既有返回结构与字段命名）
    // - 当未传入时间范围（前端“全部”场景）时：每日序列采用【分桶后】的结果以降低点位密度
    // - 当传入时间范围时：每日序列返回逐日完整数据
    // - 累计序列始终基于分桶后重建累计（已在上方计算）
    // - 月度序列按月聚合且补齐缺失月份（已在上方计算）
    // ================================================================
    const effectiveGroupBuyTrend =
      !startDate || !endDate ? aggGroupBuyTrend : groupBuyTrend;
    const effectiveOrderTrend =
      !startDate || !endDate ? aggOrderTrend : orderTrend;
    const effectivePriceTrend =
      !startDate || !endDate ? aggPriceTrend : priceTrend;
    const effectiveProfitTrend =
      !startDate || !endDate ? aggProfitTrend : profitTrend;

    return {
      groupBuyCount,
      orderCount,
      totalPrice,
      totalProfit,
      totalRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      groupBuyTrend: effectiveGroupBuyTrend,
      orderTrend: effectiveOrderTrend,
      priceTrend: effectivePriceTrend,
      profitTrend: effectiveProfitTrend,
      cumulativeGroupBuyTrend: aggCumulativeGroupBuyTrend,
      cumulativeOrderTrend: aggCumulativeOrderTrend,
      cumulativePriceTrend: aggCumulativePriceTrend,
      cumulativeProfitTrend: aggCumulativeProfitTrend,
      monthlyGroupBuyTrend,
      monthlyOrderTrend,
      monthlyPriceTrend,
      monthlyProfitTrend,
    };
  }
}
