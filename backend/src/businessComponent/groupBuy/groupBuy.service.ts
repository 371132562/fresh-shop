import { Injectable } from '@nestjs/common';
import { ErrorCode } from '../../../types/response';
import { BusinessException } from '../../exceptions/businessException';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroupBuy, Prisma } from '@prisma/client';

import { GroupBuyPageParams, ListByPage } from '../../../types/dto';

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

  async list(data: GroupBuyPageParams): Promise<ListByPage<GroupBuy[]>> {
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
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
        include: {
          supplier: true, // 包含所有 supplier 字段
          product: true, // 包含所有 product 字段
          _count: {
            select: {
              order: true, // 查询关联的订单数量
            },
          },
        },
      }),
      this.prisma.groupBuy.count({ where }), // 获取总记录数
    ]);

    return {
      data: groupBuys,
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

  async deleteImage(id: string, filename: string): Promise<void> {
    // 使用 Prisma 事务确保原子性操作
    await this.prisma
      .$transaction(async (tx) => {
        // 获取团购单详情
        const detail = await tx.groupBuy.findUnique({ where: { id } });

        // 检查团购单是否存在
        if (!detail) {
          throw new BusinessException(
            ErrorCode.RESOURCE_NOT_FOUND,
            `团购单 ${id} 不存在。`,
          );
        }

        // 3. 从图片列表中移除指定文件名
        const updatedImages = (detail.images as Prisma.JsonArray).filter(
          (item: string) => item !== filename,
        );

        // 4. 更新团购单的图片列表
        await tx.groupBuy.update({
          where: { id },
          data: {
            images: updatedImages,
          },
        });
      })
      .catch((error) => {
        // 捕获事务中的任何错误，并重新抛出，以便上层控制器可以处理
        console.error('删除图片事务失败:', error);
        throw error; // 将错误重新抛出
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
