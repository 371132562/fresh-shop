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

    // 如果指定了订单状态筛选，需要筛选出包含指定状态订单的团购单
    if (orderStatuses && orderStatuses.length > 0) {
      where.order = {
        some: {
          status: {
            in: orderStatuses,
          },
          delete: 0,
        },
      };
    }

    // 伪状态：部分退款（非已退款且部分退款金额>0）
    if (hasPartialRefund) {
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

    // 计算部分退款统计（仅统计已付款和已完成的订单）
    const partialRefundStats = await this.prisma.order.groupBy({
      by: ['groupBuyId'],
      where: {
        groupBuyId: {
          in: groupBuyIds,
        },
        status: {
          in: ['PAID', 'COMPLETED'], // 仅统计已付款和已完成的订单
        },
        delete: 0,
      },
      _sum: {
        partialRefundAmount: true,
      },
    });

    // 计算订单总金额（仅统计已付款和已完成的订单）
    const orderAmountStats = await this.prisma.order.findMany({
      where: {
        groupBuyId: {
          in: groupBuyIds,
        },
        status: {
          in: ['PAID', 'COMPLETED'], // 仅统计已付款和已完成的订单
        },
        delete: 0,
      },
      select: {
        groupBuyId: true,
        quantity: true,
        unitId: true,
        groupBuy: {
          select: {
            units: true,
          },
        },
      },
    });

    // 计算每个团购的总金额
    const totalAmountMap = new Map<string, number>();
    orderAmountStats.forEach((order) => {
      const units = order.groupBuy.units as Array<{
        id: string;
        price: number;
      }>;
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        const orderTotal = unit.price * order.quantity;
        const currentTotal = totalAmountMap.get(order.groupBuyId) || 0;
        totalAmountMap.set(order.groupBuyId, currentTotal + orderTotal);
      }
    });

    const partialRefundStatsMap = new Map<
      string,
      { partialRefundAmount: number; totalAmount: number }
    >();
    partialRefundStats.forEach((stat) => {
      const { groupBuyId, _sum } = stat;
      const totalAmount = totalAmountMap.get(groupBuyId) || 0;
      partialRefundStatsMap.set(groupBuyId, {
        partialRefundAmount: _sum.partialRefundAmount || 0,
        totalAmount: totalAmount,
      });
    });

    const groupBuysWithStats = groupBuys.map((gb) => {
      const stats = statsMap.get(gb.id) || {
        orderCount: 0,
        NOTPAID: 0,
        PAID: 0,
        COMPLETED: 0,
        REFUNDED: 0,
      };
      const partialRefundStats = partialRefundStatsMap.get(gb.id) || {
        partialRefundAmount: 0,
        totalAmount: 0,
      };
      return {
        ...gb,
        orderStats: stats,
        partialRefundStats: partialRefundStats,
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
    return this.prisma.groupBuy.findUnique({
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
