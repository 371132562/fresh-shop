// src/analysis/analysis.service.ts
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import {
  AnalysisCountParams,
  AnalysisCountResult,
  GroupBuyUnit,
} from '../../../types/dto'; // 导入类型

@Injectable()
export class AnalysisService {
  constructor(private prisma: PrismaService) {}

  async count(data: AnalysisCountParams): Promise<AnalysisCountResult> {
    const { startDate, endDate } = data;

    // 1. 统计在指定日期范围内“发起”的团购数 (基于 groupBuyStartDate)
    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        groupBuyStartDate: {
          // 使用 groupBuyStartDate 进行过滤
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
          // 同样使用 groupBuyStartDate 过滤团购单
          gte: startDate,
          lte: endDate,
        },
        delete: 0,
      },
      include: {
        order: {
          // 包含团购单下的订单
          where: {
            status: 'COMPLETED', // 只统计已完成的订单
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

    // 遍历筛选出的团购单，计算其关联订单的总数、总销售额和总利润
    for (const groupBuy of groupBuysWithOrders) {
      const units = groupBuy.units as Array<GroupBuyUnit>;

      for (const order of groupBuy.order) {
        // 遍历当前团购单下的所有订单
        orderCount++; // 每找到一个订单就计数

        const selectedUnit = units.find((unit) => unit.id === order.unitId);

        if (selectedUnit) {
          const salesAmount = selectedUnit.price * order.quantity;
          const profitAmount =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;

          totalPrice += salesAmount;
          totalProfit += profitAmount;
        }
      }
    }

    return {
      groupBuyCount,
      orderCount,
      totalPrice,
      totalProfit,
    };
  }
}
