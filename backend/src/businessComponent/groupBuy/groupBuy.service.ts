import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../exceptions/businessException';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroupBuy, Prisma } from '@prisma/client';

import {
  GroupBuyPageParams,
  ListByPage,
  GroupBuyOrderStats,
  GroupBuyListItem,
  GroupBuyUnit,
  GroupBuyUnitStats,
  Order,
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
        createdAt: 'asc',
      },
    });
  }
}
