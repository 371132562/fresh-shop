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
      for (const order of groupBuy.order as (SelectedOrder & {
        partialRefundAmount: number;
        status: OrderStatus;
      })[]) {
        orderCount++; // 每找到一个订单就计数

        // 统计每日订单趋势：根据关联团购单的发起日期计数
        const orderDate = dayjs(groupBuy.groupBuyStartDate).format(
          'YYYY-MM-DD',
        );
        orderTrendMap.set(orderDate, (orderTrendMap.get(orderDate) || 0) + 1);

        // 根据订单的 unitId 查找对应的团购规格，计算销售额和利润
        const selectedUnit = units.find((unit) => unit.id === order.unitId);

        if (selectedUnit) {
          const originalSalesAmount = selectedUnit.price * order.quantity;
          const originalProfitAmount =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCostAmount = selectedUnit.costPrice * order.quantity;

          let actualSalesAmount = 0;
          let actualProfitAmount = 0;
          if (order.status === OrderStatus.REFUNDED) {
            // 全额退款：收入为0，利润为-成本
            actualSalesAmount = 0;
            actualProfitAmount = -originalCostAmount;
          } else {
            // 部分退款：仅退款不退货
            const partial = order.partialRefundAmount || 0;
            actualSalesAmount = originalSalesAmount - partial;
            actualProfitAmount = originalProfitAmount - partial;
          }

          totalPrice += actualSalesAmount;
          totalProfit += actualProfitAmount;

          // 统计每日销售额趋势
          priceTrendMap.set(
            orderDate,
            (priceTrendMap.get(orderDate) || 0) + actualSalesAmount,
          );
          // 统计每日利润趋势
          profitTrendMap.set(
            orderDate,
            (profitTrendMap.get(orderDate) || 0) + actualProfitAmount,
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

  /**
   * 获取团购单排行数据
   */
  async getGroupBuyRank(
    params: AnalysisCountParams,
  ): Promise<GroupBuyRankResult> {
    const { startDate, endDate } = params;

    // 获取指定时间范围内的团购单及其关联订单
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
          const originalSale = selectedUnit.price * order.quantity;
          const originalProfit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCost = selectedUnit.costPrice * order.quantity;

          let actualSale = 0;
          let actualProfit = 0;
          if (order.status === OrderStatus.REFUNDED) {
            actualSale = 0;
            actualProfit = -originalCost;
          } else {
            const partial = order.partialRefundAmount || 0;
            actualSale = originalSale - partial;
            actualProfit = originalProfit - partial;
          }

          totalSales += actualSale;
          totalProfit += actualProfit;
        }
      }

      return {
        id: gb.id,
        name: gb.name,
        orderCount: gb.order.filter((o) => o.status !== OrderStatus.REFUNDED)
          .length,
        totalSales,
        totalProfit,
        groupBuyStartDate: gb.groupBuyStartDate,
      };
    });

    // 生成排行榜
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
    const { startDate, endDate } = params;

    // 获取指定时间范围内的订单及其关联客户信息
    // 根据团购发起时间进行过滤，而不是订单创建时间
    const orders = await this.prisma.order.findMany({
      where: {
        delete: 0,
        status: {
          in: [OrderStatus.PAID, OrderStatus.COMPLETED],
        },
        groupBuy: {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
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

      // 计算订单金额（扣除部分退款）
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

    // 计算平均订单金额并转换为数组
    const customersArray = Array.from(customerData.values()).map(
      (customer) => ({
        ...customer,
        averageOrderAmount:
          customer.orderCount > 0
            ? customer.totalAmount / customer.orderCount
            : 0,
      }),
    );

    // 生成排行榜
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
    const { startDate, endDate } = params;

    // 获取指定时间范围内的团购单及其关联订单和供应商信息
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        groupBuyStartDate: {
          gte: startDate,
          lte: endDate,
        },
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
      const orderCount = gb.order.length;

      for (const order of gb.order as Array<{
        quantity: number;
        unitId: string;
        partialRefundAmount: number;
        status: OrderStatus;
      }>) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          const originalSale = selectedUnit.price * order.quantity;
          const originalProfit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          const originalCost = selectedUnit.costPrice * order.quantity;

          let actualSale = 0;
          let actualProfit = 0;
          if (order.status === OrderStatus.REFUNDED) {
            actualSale = 0;
            actualProfit = -originalCost;
          } else {
            const partial = order.partialRefundAmount || 0;
            actualSale = originalSale - partial;
            actualProfit = originalProfit - partial;
          }

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

    // 生成排行榜
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

      // 遍历当前团购单的所有订单
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
          mergedData.totalRevenue += revenue;
          mergedData.totalProfit += profit;
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
          // 全额退款：收入为0，利润为-成本；不计入订单量及客户/商品/分类/地域统计
          const refundedCost = unit.costPrice * order.quantity;
          totalProfit += -refundedCost;
          // 同步计入当前团购历史项的利润（体现最终损益）
          groupBuyProfit += -refundedCost;
          // totalRevenue += 0;
          // 不累计 partialRefundAmount（对展示无意义）
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

        // 统计商品数据
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

        // 统计分类数据
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

        // 统计地域数据
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

      // 添加团购历史记录
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
