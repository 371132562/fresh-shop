// src/analysis/analysis.service.ts
import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs'; // 导入 dayjs
import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import * as isSameOrBefore from 'dayjs/plugin/isSameOrBefore'; // 导入 isSameOrBefore 插件

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(isSameOrBefore); // 扩展 isSameOrBefore 插件

import { PrismaService } from '../../../prisma/prisma.service';
import {
  AnalysisCountParams,
  AnalysisCountResult,
  GroupBuyUnit,
  AnalysisRankResult,
} from '../../../types/dto'; // 导入类型

/**
 * @interface SelectedOrder
 * @description 订单中需要查询的字段类型定义
 */
interface SelectedOrder {
  quantity: number;
  unitId: string;
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
    const { startDate, endDate } = data;

    // 1. 统计在指定日期范围内“发起”的团购数 (基于 groupBuyStartDate)
    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        groupBuyStartDate: {
          gte: startDate,
          lte: endDate,
        },
        delete: 0, // 确保只统计未删除的团购单
      },
    });

    // 2. 查询在指定日期范围内“发起”的团购单，并包含其所有已完成且未删除的订单
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        groupBuyStartDate: {
          gte: startDate,
          lte: endDate,
        },
        delete: 0,
      },
      include: {
        order: {
          where: {
            status: {
              in: ['PAID', 'COMPLETED'], // 只统计已付款和已完成的订单
            },
            delete: 0, // 确保订单未被删除
          },
          select: {
            quantity: true,
            unitId: true,
          },
        },
      },
    });

    let orderCount = 0; // 发起的订单总数 (这些订单关联的团购单在指定日期内发起)
    let totalPrice = 0; // 总销售额
    let totalProfit = 0; // 总利润

    // 用于统计每日趋势的数据结构：日期字符串到数量的映射
    const groupBuyTrendMap = new Map<string, number>();
    const orderTrendMap = new Map<string, number>();
    const priceTrendMap = new Map<string, number>();
    const profitTrendMap = new Map<string, number>();

    // 遍历筛选出的团购单，计算其关联订单的总数、总销售额和总利润
    for (const groupBuy of groupBuysWithOrders) {
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 统计每日团购趋势：根据团购发起日期计数
      const groupBuyDate = dayjs(groupBuy.groupBuyStartDate).format(
        'YYYY-MM-DD',
      );
      groupBuyTrendMap.set(
        groupBuyDate,
        (groupBuyTrendMap.get(groupBuyDate) || 0) + 1,
      );

      // 遍历当前团购单下的所有订单，计算订单总数、销售额、利润及订单趋势
      for (const order of groupBuy.order as SelectedOrder[]) {
        orderCount++; // 每找到一个订单就计数

        // 统计每日订单趋势：根据关联团购单的发起日期计数
        const orderDate = dayjs(groupBuy.groupBuyStartDate).format(
          'YYYY-MM-DD',
        );
        orderTrendMap.set(orderDate, (orderTrendMap.get(orderDate) || 0) + 1);

        // 根据订单的 unitId 查找对应的团购规格，计算销售额和利润
        const selectedUnit = units.find((unit) => unit.id === order.unitId);

        if (selectedUnit) {
          const salesAmount = selectedUnit.price * order.quantity;
          const profitAmount =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;

          totalPrice += salesAmount;
          totalProfit += profitAmount;

          // 统计每日销售额趋势
          priceTrendMap.set(
            orderDate,
            (priceTrendMap.get(orderDate) || 0) + salesAmount,
          );
          // 统计每日利润趋势
          profitTrendMap.set(
            orderDate,
            (profitTrendMap.get(orderDate) || 0) + profitAmount,
          );
        }
      }
    }

    // 填充日期范围内的零值，并格式化最终的趋势数据
    const groupBuyTrend: { date: Date; count: number }[] = [];
    const orderTrend: { date: Date; count: number }[] = [];
    const priceTrend: { date: Date; count: number }[] = [];
    const profitTrend: { date: Date; count: number }[] = [];

    let currentDate = dayjs(startDate).startOf('day');
    const endDay = dayjs(endDate).startOf('day');

    // 遍历从 startDate 到 endDate 的每一天，填充趋势数据
    while (currentDate.isSameOrBefore(endDay, 'day')) {
      const dateString = currentDate.format('YYYY-MM-DD');
      groupBuyTrend.push({
        date: currentDate.toDate(),
        count: groupBuyTrendMap.get(dateString) || 0,
      });
      orderTrend.push({
        date: currentDate.toDate(),
        count: orderTrendMap.get(dateString) || 0,
      });
      priceTrend.push({
        // 填充销售额趋势
        date: currentDate.toDate(),
        count: priceTrendMap.get(dateString) || 0,
      });
      profitTrend.push({
        // 填充利润趋势
        date: currentDate.toDate(),
        count: profitTrendMap.get(dateString) || 0,
      });
      currentDate = currentDate.add(1, 'day');
    }

    // 返回所有统计结果
    return {
      groupBuyCount,
      orderCount,
      totalPrice,
      totalProfit,
      groupBuyTrend,
      orderTrend,
      priceTrend,
      profitTrend,
    };
  }

  async rank(params: AnalysisCountParams): Promise<AnalysisRankResult> {
    const { startDate, endDate } = params;

    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        groupBuyStartDate: {
          gte: startDate,
          lte: endDate,
        },
        delete: 0,
      },
      include: {
        order: {
          where: {
            delete: 0,
            status: {
              in: ['PAID', 'COMPLETED'],
            },
          },
          select: {
            quantity: true,
            unitId: true,
          },
        },
      },
    });

    // 1. 团购单以其包含的订单量进行团购单排名
    const groupBuyRankByOrderCount = groupBuysWithOrders
      .map((gb) => ({
        id: gb.id,
        name: gb.name,
        orderCount: gb.order.length,
      }))
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);

    // 2 & 3. 团购单以其包含的所有订单的销售额和利润进行排名
    const groupBuysWithStats = groupBuysWithOrders.map((gb) => {
      let totalSales = 0;
      let totalProfit = 0;
      const units = gb.units as Array<GroupBuyUnit>;

      for (const order of gb.order as SelectedOrder[]) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);

        if (selectedUnit) {
          totalSales += selectedUnit.price * order.quantity;
          totalProfit +=
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
        }
      }

      return {
        id: gb.id,
        name: gb.name,
        totalSales,
        totalProfit,
      };
    });

    const groupBuyRankByTotalSales = [...groupBuysWithStats]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        name: item.name,
        totalSales: item.totalSales,
      }));

    const groupBuyRankByTotalProfit = [...groupBuysWithStats]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        name: item.name,
        totalProfit: item.totalProfit,
      }));

    // 4. 以供货商关联的团购单数量进行排名
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        delete: 0,
      },
      include: {
        groupBuy: {
          where: {
            groupBuyStartDate: {
              gte: startDate,
              lte: endDate,
            },
            delete: 0,
          },
        },
      },
    });

    const supplierRankByGroupBuyCount = suppliers
      .map((s) => ({
        id: s.id,
        name: s.name,
        groupBuyCount: s.groupBuy.length,
      }))
      .sort((a, b) => b.groupBuyCount - a.groupBuyCount)
      .slice(0, 10);

    return {
      groupBuyRankByOrderCount,
      groupBuyRankByTotalSales,
      groupBuyRankByTotalProfit,
      supplierRankByGroupBuyCount,
    };
  }
}
