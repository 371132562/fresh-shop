import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../exceptions/businessException';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroupBuy, Prisma, OrderStatus } from '@prisma/client';

import {
  GroupBuyPageParams,
  ListByPage,
  GroupBuyOrderStats,
  GroupBuyListItem,
  GroupBuyUnit,
  GroupBuyUnitStats,
  Order,
  MergedGroupBuyOverviewParams,
  MergedGroupBuyOverviewResult,
  MergedGroupBuyOverviewDetail,
  MergedGroupBuyOverviewDetailParams,
  CustomerPurchaseFrequency,
  RegionalSalesItem,
  GroupBuyLaunchHistory,
} from '../../../types/dto';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class GroupBuyService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(data: Prisma.GroupBuyCreateInput): Promise<GroupBuy> {
    return this.prisma.groupBuy.create({ data });
  }

  async update(
    id: string,
    data: Prisma.GroupBuyUpdateInput,
  ): Promise<GroupBuy> {
    return this.prisma.groupBuy.update({
      where: { id },
      data,
    });
  }

  async list(
    data: GroupBuyPageParams,
  ): Promise<ListByPage<GroupBuyListItem[]>> {
    const {
      page,
      pageSize,
      name,
      startDate,
      endDate,
      supplierIds,
      productIds,
      orderStatuses,
      hasPartialRefund,
    } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.GroupBuyWhereInput = {
      delete: 0, // 仅查询未删除的供货商
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (startDate && endDate) {
      where.groupBuyStartDate = {
        gte: startDate, // 大于或等于 startDate
        lte: endDate, // 小于或等于 endDate
      };
    }

    if (supplierIds && supplierIds.length > 0) {
      where.supplierId = {
        in: supplierIds,
      };
    }

    if (productIds && productIds.length > 0) {
      where.productId = {
        in: productIds,
      };
    }

    // 订单状态与“部分退款”伪状态的组合筛选（并集 OR）
    // 情况1：同时有 orderStatuses 与 hasPartialRefund => 返回并集
    // 情况2：只有 orderStatuses => 按状态过滤
    // 情况3：只有 hasPartialRefund => 按部分退款过滤
    if (hasPartialRefund && orderStatuses && orderStatuses.length > 0) {
      where.order = {
        some: {
          delete: 0,
          OR: [
            {
              status: {
                in: orderStatuses,
              },
            },
            {
              AND: [
                { partialRefundAmount: { gt: 0 } },
                { status: { not: 'REFUNDED' } },
              ],
            },
          ],
        },
      };
    } else if (orderStatuses && orderStatuses.length > 0) {
      // 如果指定了订单状态筛选，需要筛选出包含指定状态订单的团购单
      where.order = {
        some: {
          status: {
            in: orderStatuses,
          },
          delete: 0,
        },
      };
    } else if (hasPartialRefund) {
      // 伪状态：部分退款（非已退款且部分退款金额>0）
      where.order = {
        some: {
          delete: 0,
          partialRefundAmount: { gt: 0 },
          status: { not: 'REFUNDED' },
        },
      };
    }

    const [groupBuys, totalCount] = await this.prisma.$transaction([
      this.prisma.groupBuy.findMany({
        skip: skip,
        take: pageSize,
        orderBy: [
          {
            groupBuyStartDate: 'desc',
          },
          {
            createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
          },
        ],
        where,
        include: {
          supplier: true, // 包含所有 supplier 字段
          product: true, // 包含所有 product 字段
        },
      }),
      this.prisma.groupBuy.count({ where }), // 获取总记录数
    ]);

    const groupBuyIds = groupBuys.map((item) => item.id);

    const orderStats = await this.prisma.order.groupBy({
      by: ['groupBuyId', 'status'],
      where: {
        groupBuyId: {
          in: groupBuyIds,
        },
        delete: 0,
      },
      _count: {
        id: true,
      },
    });

    const statsMap = new Map<string, GroupBuyOrderStats>();
    orderStats.forEach((stat) => {
      const { groupBuyId, status, _count } = stat;
      if (!statsMap.has(groupBuyId)) {
        statsMap.set(groupBuyId, {
          orderCount: 0,
          NOTPAID: 0,
          PAID: 0,
          COMPLETED: 0,
          REFUNDED: 0,
        });
      }
      const currentStats = statsMap.get(groupBuyId);
      if (currentStats) {
        currentStats[status] = _count.id;
        currentStats.orderCount += _count.id;
      }
    });

    // 计算总退款金额：部分退款（非已退款订单）+ 全额退款（已退款订单的订单总额）
    // 1) 统计非已退款订单的部分退款金额
    const nonRefundedPartialRefundStats = await this.prisma.order.groupBy({
      by: ['groupBuyId'],
      where: {
        groupBuyId: { in: groupBuyIds },
        delete: 0,
        status: { not: 'REFUNDED' },
      },
      _sum: {
        partialRefundAmount: true,
      },
    });

    const nonRefundedPartialRefundMap = new Map<string, number>();
    nonRefundedPartialRefundStats.forEach((stat) => {
      nonRefundedPartialRefundMap.set(
        stat.groupBuyId,
        stat._sum.partialRefundAmount || 0,
      );
    });

    // 2) 统计已退款订单的应退金额（按规格单价*数量计算）
    const refundedOrders = await this.prisma.order.findMany({
      where: {
        groupBuyId: { in: groupBuyIds },
        status: 'REFUNDED',
        delete: 0,
      },
      select: {
        groupBuyId: true,
        quantity: true,
        unitId: true,
        groupBuy: { select: { units: true } },
      },
    });

    const refundedGrossMap = new Map<string, number>();
    refundedOrders.forEach((order) => {
      const units = order.groupBuy.units as Array<{
        id: string;
        price: number;
      }>;
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        const gross = unit.price * order.quantity;
        refundedGrossMap.set(
          order.groupBuyId,
          (refundedGrossMap.get(order.groupBuyId) || 0) + gross,
        );
      }
    });

    const totalRefundAmountMap = new Map<string, number>();
    groupBuyIds.forEach((id) => {
      const partialRefund = nonRefundedPartialRefundMap.get(id) || 0;
      const fullRefund = refundedGrossMap.get(id) || 0;
      totalRefundAmountMap.set(id, partialRefund + fullRefund);
    });

    const groupBuysWithStats = groupBuys.map((gb) => {
      const stats = statsMap.get(gb.id) || {
        orderCount: 0,
        NOTPAID: 0,
        PAID: 0,
        COMPLETED: 0,
        REFUNDED: 0,
      };
      return {
        ...gb,
        orderStats: stats,
        totalRefundAmount: totalRefundAmountMap.get(gb.id) || 0,
      };
    });

    return {
      data: groupBuysWithStats,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string) {
    // 获取团购详情数据
    const groupBuy = await this.prisma.groupBuy.findUnique({
      where: {
        id,
      },
      // 使用 include 选项来包含关联的 supplier 和 product 信息
      include: {
        supplier: true, // 包含所有 supplier 字段
        product: true, // 包含所有 product 字段
        order: {
          where: {
            delete: 0,
          },
          include: {
            customer: {
              select: {
                name: true,
                phone: true,
                wechat: true,
              },
            },
          },
        }, // 包含所有 order 字段
      },
    });

    if (!groupBuy) {
      return null;
    }

    // 计算规格统计、销售额、利润和退款相关统计
    let unitStatistics: GroupBuyUnitStats[] = [];
    let totalSalesAmount = 0;
    let totalProfit = 0;
    let totalRefundAmount = 0;
    let totalPartialRefundAmount = 0;
    let totalRefundedOrderCount = 0;
    let totalPartialRefundOrderCount = 0;
    let totalOrderCount = 0; // 有效订单数量（PAID、COMPLETED、REFUNDED）

    if (
      groupBuy?.order?.length &&
      groupBuy?.units &&
      Array.isArray(groupBuy.units)
    ) {
      // 构建规格映射表，同时初始化统计对象
      const unitMap = new Map<string, GroupBuyUnit>();
      const stats: Record<string, GroupBuyUnitStats> = {};

      // 初始化规格统计对象和映射表
      (groupBuy.units as GroupBuyUnit[]).forEach((unit) => {
        unitMap.set(unit.id, unit);
        stats[unit.id] = {
          name: unit.unit,
          quantity: 0,
          price: unit.price,
        };
      });

      // 一次遍历同时计算规格统计、销售额、利润和部分退款总金额
      (groupBuy.order as Order[]).forEach((order) => {
        // 统计所有订单的数量（用于规格统计）
        if (order.unitId && stats[order.unitId]) {
          stats[order.unitId].quantity += order.quantity;
        }

        // 统计退款相关数据
        const partialRefund = order.partialRefundAmount || 0;
        totalPartialRefundAmount += partialRefund;

        if (order.status === 'REFUNDED') {
          const unit = order.unitId ? unitMap.get(order.unitId) : undefined;
          if (unit) {
            const gross = unit.price * order.quantity;
            totalRefundAmount += gross;
          }
          totalRefundedOrderCount += 1;
        } else {
          totalRefundAmount += partialRefund;
          if (partialRefund > 0) {
            totalPartialRefundOrderCount += 1;
          }
        }

        // 计算销售额和利润：包含已支付、已完成、已退款三种状态
        if (order.status === 'PAID' || order.status === 'COMPLETED') {
          totalOrderCount += 1; // 统计有效订单数量
          const unit = order.unitId ? unitMap.get(order.unitId) : undefined;
          if (unit) {
            const gross = unit.price * order.quantity;
            const net = Math.max(0, gross - partialRefund);
            totalSalesAmount += net;

            // 计算利润：销售额减去成本
            const cost = unit.costPrice * order.quantity;
            const profit = net - cost;
            totalProfit += profit;
          }
        } else if (order.status === 'REFUNDED') {
          // 已退款订单：收入为0，利润为-成本，计入损益但不计入订单量
          const unit = order.unitId ? unitMap.get(order.unitId) : undefined;
          if (unit) {
            const cost = unit.costPrice * order.quantity;
            totalProfit += -cost; // 退款订单的利润为负成本
          }
        }
      });

      // 过滤掉未被订购的规格
      unitStatistics = Object.values(stats).filter((item) => item.quantity > 0);
    }

    return {
      ...groupBuy,
      unitStatistics,
      totalSalesAmount,
      totalProfit,
      totalRefundAmount,
      totalPartialRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      totalOrderCount, // 有效订单数量
    };
  }

  async delete(id: string) {
    const existingGroupBuy = await this.prisma.groupBuy.findUnique({
      where: { id, delete: 0 },
    });
    if (!existingGroupBuy) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '团购单不存在或已被删除。',
      );
    }

    // 使用事务来确保团购单和关联订单的删除是原子操作
    const result = await this.prisma.$transaction(async (tx) => {
      // 先软删除关联的订单
      await tx.order.updateMany({
        where: {
          groupBuyId: id,
          delete: 0,
        },
        data: {
          delete: 1,
        },
      });

      // 再软删除团购单
      const deletedGroupBuy = await tx.groupBuy.update({
        where: {
          id,
        },
        data: {
          delete: 1,
        },
      });

      return deletedGroupBuy;
    });

    // 软删除成功后，清理关联的图片
    if (existingGroupBuy.images && Array.isArray(existingGroupBuy.images)) {
      for (const filename of existingGroupBuy.images as string[]) {
        await this.uploadService.cleanupOrphanedImage(filename);
      }
    }

    return result;
  }

  async listAll() {
    return this.prisma.groupBuy.findMany({
      where: {
        delete: 0, // 仅查询未删除的团购单
      },
      select: {
        id: true,
        name: true,
        groupBuyStartDate: true,
        units: true,
      },
      orderBy: {
        groupBuyStartDate: 'desc',
      },
    });
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
      orderBy: {
        groupBuyStartDate: 'desc',
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
        totalRefundAmount: number;
        totalOrderCount: number;
        uniqueCustomerIds: Set<string>;
        totalQuantity: number;
        groupBuyStartDate?: Date;
        groupBuyId?: string; // 单期模式下记录团购ID
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
          totalRefundAmount: 0,
          totalOrderCount: 0,
          uniqueCustomerIds: new Set<string>(),
          totalQuantity: 0,
          // 单期模式下记录发起时间和团购ID
          ...(mergeSameName
            ? {}
            : {
                groupBuyStartDate: groupBuy.groupBuyStartDate,
                groupBuyId: groupBuy.id,
              }),
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
          // 退款金额累计：全额退款记原始收入；否则累计部分退款金额
          if (order.status === OrderStatus.REFUNDED) {
            mergedData.totalRefundAmount += originalRevenue;
          } else if (partialRefundAmount > 0) {
            mergedData.totalRefundAmount += partialRefundAmount;
          }
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
        totalRefundAmount: data.totalRefundAmount,
        totalProfitMargin,
        totalOrderCount: data.totalOrderCount,
        uniqueCustomerCount,
        averageCustomerOrderValue,
        groupBuyStartDate: data.groupBuyStartDate,
        groupBuyId: data.groupBuyId, // 单期模式下返回团购ID
      };
    });

    // 6) 排序：根据 sortField + sortOrder（支持单期模式按发起时间排序）
    mergedDataArray.sort((a, b) => {
      // 单期模式下且选择按发起时间排序时，使用时间字段比较
      if (sortField === 'groupBuyStartDate' && !mergeSameName) {
        const at = a.groupBuyStartDate
          ? new Date(a.groupBuyStartDate).getTime()
          : 0;
        const bt = b.groupBuyStartDate
          ? new Date(b.groupBuyStartDate).getTime()
          : 0;
        return sortOrder === 'asc' ? at - bt : bt - at;
      }

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
        case 'totalRefundAmount':
          aValue = a.totalRefundAmount;
          bValue = b.totalRefundAmount;
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

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
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
      orderBy: {
        groupBuyStartDate: 'desc',
      },
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
        totalRefundAmount: 0,
        totalPartialRefundAmount: 0,
        totalRefundedOrderCount: 0,
        totalPartialRefundOrderCount: 0,
        totalProfitMargin: 0,
        totalOrderCount: 0,
        uniqueCustomerCount: 0,
        averageCustomerOrderValue: 0,
        totalGroupBuyCount: 0,
        customerPurchaseFrequency: [],
        multiPurchaseCustomerCount: 0,
        multiPurchaseCustomerRatio: 0,
        regionalSales: [],
        groupBuyLaunchHistory: [],
      };
    }

    // 2. 聚合数据计算
    let totalRevenue = 0;
    let totalProfit = 0;
    let totalRefundAmount = 0;
    let totalPartialRefundAmount = 0;
    let totalRefundedOrderCount = 0;
    let totalPartialRefundOrderCount = 0;
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

      // 遍历当前团购单的所有订单（金额统计覆盖 PAID/COMPLETED/REFUNDED；
      // 客户购买次数与地域去重仅计 PAID/COMPLETED）
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

            // 统计退款相关数据
            if (order.status === OrderStatus.REFUNDED) {
              totalRefundAmount += originalRevenue;
              totalRefundedOrderCount += 1;
            } else {
              totalRefundAmount += partialRefundAmount;
              if (partialRefundAmount > 0) {
                totalPartialRefundOrderCount += 1;
              }
            }

            // 订单量统计：仅统计已支付与已完成
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              totalOrderCount += 1;
            }
            // 参与客户去重：仅在订单为 PAID/COMPLETED 时计入
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              uniqueCustomerIds.add(order.customerId);
            }

            // 仅对已支付/已完成订单统计"购买次数"和"地域客户去重"
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              // 统计客户购买次数
              const currentCount =
                customerPurchaseCounts.get(order.customerId) || 0;
              customerPurchaseCounts.set(order.customerId, currentCount + 1);

              // 统计地域销售数据（客户去重）
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

    // 6. 客户地址分布
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
        let totalRefundAmount = 0;
        let partialRefundOrderCount = 0;
        let refundedOrderCount = 0;
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
              const originalRevenue = selectedUnit.price * order.quantity;
              const originalProfit =
                (selectedUnit.price - selectedUnit.costPrice) * order.quantity;
              const orderPartialRefundAmount = order.partialRefundAmount || 0;

              const orderRevenue = originalRevenue - orderPartialRefundAmount;
              const orderProfit = originalProfit - orderPartialRefundAmount;

              revenue += orderRevenue;
              profit += orderProfit;
              totalRefundAmount += orderPartialRefundAmount;

              // 统计部分退款订单数
              if (orderPartialRefundAmount > 0) {
                partialRefundOrderCount += 1;
              }
            }
          }
          // 已退款订单：收入为0、利润为-成本，计入损益但不计入订单量
          else if (order.status === OrderStatus.REFUNDED) {
            refundedOrderCount += 1;
            const selectedUnit = units.find((unit) => unit.id === order.unitId);
            if (selectedUnit) {
              const originalCost = selectedUnit.costPrice * order.quantity;
              const originalRevenue = selectedUnit.price * order.quantity;
              profit += -originalCost;
              totalRefundAmount += originalRevenue;
            }
          }
        }

        return {
          groupBuyId: groupBuy.id,
          groupBuyName: groupBuy.name,
          launchDate: groupBuy.groupBuyStartDate,
          orderCount,
          revenue,
          profit,
          totalRefundAmount,
          partialRefundOrderCount,
          customerCount: customerIds.size,
          refundedOrderCount,
          totalRefundOrderCount: partialRefundOrderCount + refundedOrderCount,
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
      totalRefundAmount,
      totalPartialRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      totalProfitMargin,
      totalOrderCount,
      uniqueCustomerCount,
      averageCustomerOrderValue,
      totalGroupBuyCount,
      customerPurchaseFrequency,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      regionalSales: regionalSalesResult,
      groupBuyLaunchHistory,
    };
  }
}
