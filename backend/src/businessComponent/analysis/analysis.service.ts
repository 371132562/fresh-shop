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
  GroupBuyRankResult,
  MergedGroupBuyRankResult,
  CustomerRankResult,
  SupplierRankResult,
  MergedGroupBuyCustomerRankParams,
  MergedGroupBuyCustomerRankResult,
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

    // 计算每个团购单的统计数据
    const groupBuysWithStats = groupBuysWithOrders.map((gb) => {
      let totalSales = 0;
      let totalProfit = 0;
      const units = gb.units as Array<GroupBuyUnit>;

      for (const order of gb.order as Array<{
        quantity: number;
        unitId: string;
      }>) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          const sale = selectedUnit.price * order.quantity;
          const profit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          totalSales += sale;
          totalProfit += profit;
        }
      }

      return {
        id: gb.id,
        name: gb.name,
        orderCount: gb.order.length,
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
   * 获取团购单（合并）排行数据
   */
  async getMergedGroupBuyRank(
    params: AnalysisCountParams,
  ): Promise<MergedGroupBuyRankResult> {
    const { startDate, endDate } = params;

    // 获取指定时间范围内的团购单及其关联订单和产品信息
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        groupBuyStartDate: {
          gte: startDate,
          lte: endDate,
        },
        delete: 0,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
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

    // 按团购单名称合并团购单数据
    const mergedData = new Map<
      string,
      {
        productId: string;
        name: string;
        orderCount: number;
        totalSales: number;
        totalProfit: number;
      }
    >();

    for (const gb of groupBuysWithOrders) {
      const productId = gb.product.id;
      const groupBuyName = gb.name; // 使用团购单名称作为合并键
      const units = gb.units as Array<GroupBuyUnit>;

      let totalSales = 0;
      let totalProfit = 0;
      const orderCount = gb.order.length;

      for (const order of gb.order as Array<{
        quantity: number;
        unitId: string;
      }>) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          const sale = selectedUnit.price * order.quantity;
          const profit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          totalSales += sale;
          totalProfit += profit;
        }
      }

      // 使用团购单名称作为合并的键值
      if (mergedData.has(groupBuyName)) {
        const existing = mergedData.get(groupBuyName)!;
        existing.orderCount += orderCount;
        existing.totalSales += totalSales;
        existing.totalProfit += totalProfit;
      } else {
        mergedData.set(groupBuyName, {
          productId,
          name: groupBuyName, // 存储团购单名称
          orderCount,
          totalSales,
          totalProfit,
        });
      }
    }

    const mergedArray = Array.from(mergedData.values());

    // 生成排行榜
    const mergedGroupBuyRankByOrderCount = [...mergedArray]
      .sort((a, b) => b.orderCount - a.orderCount)
      .slice(0, 10);
    const mergedGroupBuyRankByTotalSales = [...mergedArray]
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 10);
    const mergedGroupBuyRankByTotalProfit = [...mergedArray]
      .sort((a, b) => b.totalProfit - a.totalProfit)
      .slice(0, 10);

    return {
      mergedGroupBuyRankByOrderCount,
      mergedGroupBuyRankByTotalSales,
      mergedGroupBuyRankByTotalProfit,
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
    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        delete: 0,
        status: {
          in: ['PAID', 'COMPLETED'],
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

      // 计算订单金额
      let orderAmount = 0;
      const selectedUnit = units.find((unit) => unit.id === order.unitId);
      if (selectedUnit) {
        orderAmount = selectedUnit.price * order.quantity;
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
      }>) {
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          const sale = selectedUnit.price * order.quantity;
          const profit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
          totalSales += sale;
          totalProfit += profit;
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
   * 获取合并团购单的客户排行数据
   */
  async getMergedGroupBuyCustomerRank(
    params: MergedGroupBuyCustomerRankParams,
  ): Promise<MergedGroupBuyCustomerRankResult> {
    const { groupBuyName, startDate, endDate } = params;

    // 获取指定时间范围内同名的团购单及其关联订单和客户信息
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        name: groupBuyName, // 按团购单名称筛选
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
          include: {
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

    // 按客户合并订单数据
    const customerOrderMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        orderCount: number;
      }
    >();

    for (const gb of groupBuysWithOrders) {
      for (const order of gb.order) {
        const customerId = order.customer.id;
        const customerName = order.customer.name;

        if (customerOrderMap.has(customerId)) {
          const existing = customerOrderMap.get(customerId)!;
          existing.orderCount += 1;
        } else {
          customerOrderMap.set(customerId, {
            customerId,
            customerName,
            orderCount: 1,
          });
        }
      }
    }

    // 转换为数组并按订单数量从高到低排序
    const customerRank = Array.from(customerOrderMap.values()).sort(
      (a, b) => b.orderCount - a.orderCount,
    );

    return {
      groupBuyName,
      customerRank,
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
            customerId: true,
          },
        },
      },
    });

    // 2. 按团购单名称进行分组聚合
    const mergedDataMap = new Map<
      string,
      {
        groupBuyName: string;
        totalRevenue: number;
        totalProfit: number;
        totalOrderCount: number;
        uniqueCustomerIds: Set<string>;
        totalQuantity: number;
      }
    >();

    // 遍历所有团购单，按名称聚合数据
    for (const groupBuy of groupBuysWithOrders) {
      const groupBuyName = groupBuy.name;
      const units = groupBuy.units as Array<GroupBuyUnit>;

      // 如果该名称的团购单还未在Map中，则初始化
      if (!mergedDataMap.has(groupBuyName)) {
        mergedDataMap.set(groupBuyName, {
          groupBuyName,
          totalRevenue: 0,
          totalProfit: 0,
          totalOrderCount: 0,
          uniqueCustomerIds: new Set<string>(),
          totalQuantity: 0,
        });
      }

      const mergedData = mergedDataMap.get(groupBuyName)!;

      // 遍历当前团购单的所有订单
      for (const order of groupBuy.order as Array<{
        quantity: number;
        unitId: string;
        customerId: string;
      }>) {
        // 根据unitId找到对应的规格信息
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          const revenue = selectedUnit.price * order.quantity;
          const profit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;

          mergedData.totalRevenue += revenue;
          mergedData.totalProfit += profit;
          mergedData.totalOrderCount += 1;
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
    const { groupBuyName, startDate, endDate } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
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
        supplier: true,
        product: true,
        order: {
          where: {
            delete: 0,
            status: {
              in: ['PAID', 'COMPLETED'],
            },
          },
          include: {
            customer: {
              include: {
                customerAddress: true,
              },
            },
          },
        },
      },
    });

    if (groupBuysWithOrders.length === 0) {
      // 如果没有找到数据，返回空的详情对象
      return {
        groupBuyName,
        supplierNames: [],
        startDate,
        endDate,
        totalRevenue: 0,
        totalProfit: 0,
        totalProfitMargin: 0,
        totalOrderCount: 0,
        uniqueCustomerCount: 0,
        averageCustomerOrderValue: 0,
        totalGroupBuyCount: 0,
        customerPurchaseFrequency: [],
        multiPurchaseCustomerCount: 0,
        multiPurchaseCustomerRatio: 0,
        regionalSales: [],
      };
    }

    // 2. 聚合数据计算
    let totalRevenue = 0;
    let totalProfit = 0;
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

      // 遍历当前团购单的所有订单
      for (const order of groupBuy.order) {
        // 根据unitId找到对应的规格信息
        const selectedUnit = units.find((unit) => unit.id === order.unitId);
        if (selectedUnit) {
          const revenue = selectedUnit.price * order.quantity;
          const profit =
            (selectedUnit.price - selectedUnit.costPrice) * order.quantity;

          totalRevenue += revenue;
          totalProfit += profit;
          totalOrderCount += 1;
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

    const customerPurchaseFrequency: CustomerPurchaseFrequency[] = Array.from(
      purchaseFrequencyMap.entries(),
    )
      .map(([purchaseCount, customerCount]) => ({
        frequency: purchaseCount,
        count: customerCount,
      }))
      .sort((a, b) => b.frequency - a.frequency); // 按购买次数从高到低排序

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

    return {
      groupBuyName,
      supplierNames: Array.from(supplierNamesSet),
      startDate,
      endDate,
      totalRevenue,
      totalProfit,
      totalProfitMargin,
      totalOrderCount,
      uniqueCustomerCount,
      averageCustomerOrderValue,
      totalGroupBuyCount,
      customerPurchaseFrequency,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      regionalSales: regionalSalesResult,
    };
  }

  /**
   * 获取特定购买频次的客户列表
   */
  async getMergedGroupBuyFrequencyCustomers(
    params: MergedGroupBuyFrequencyCustomersParams,
  ): Promise<MergedGroupBuyFrequencyCustomersResult> {
    const { groupBuyName, frequency, startDate, endDate } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
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
              in: ['PAID', 'COMPLETED'],
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

    // 4. 筛选出指定购买频次的客户
    const filteredCustomers = Array.from(customerPurchaseCounts.values())
      .filter((item) => item.count === frequency)
      .map((item) => item.customer);

    return {
      groupBuyName,
      frequency,
      customers: filteredCustomers,
    };
  }

  /**
   * 获取特定区域的客户列表
   */
  async getMergedGroupBuyRegionalCustomers(
    params: MergedGroupBuyRegionalCustomersParams,
  ): Promise<MergedGroupBuyRegionalCustomersResult> {
    const { groupBuyName, addressId, startDate, endDate } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
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
              in: ['PAID', 'COMPLETED'],
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
}
