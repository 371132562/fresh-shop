import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../exceptions/businessException';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroupBuy, Prisma } from '@prisma/client';

import {
  GroupBuyPageParams,
  ListByPage,
  GroupBuyOrderStats,
} from '../../../types/dto';

@Injectable()
export class GroupBuyService {
  constructor(private prisma: PrismaService) {}

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
  ): Promise<ListByPage<(GroupBuy & { orderStats: GroupBuyOrderStats })[]>> {
    const {
      page,
      pageSize,
      name,
      startDate,
      endDate,
      supplierIds,
      productIds,
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
    const orderCount = await this.prisma.order.count({
      where: {
        groupBuyId: id,
        delete: 0,
      },
    });

    if (orderCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该团购单下存在关联的订单（${orderCount}条），无法删除。`,
      );
    }
    return this.prisma.groupBuy.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
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
