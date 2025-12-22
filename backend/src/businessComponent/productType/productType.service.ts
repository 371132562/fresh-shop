import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductType, Prisma, OrderStatus } from '@prisma/client';

import {
  ProductTypePageParams,
  ListByPage,
  ProductTypeListItem,
  GroupBuyUnit,
  ProductTypeMigratePreviewParams,
  ProductTypeMigratePreviewResult,
  ProductTypeMigrateParams,
  ProductTypeMigrateResult,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class ProductTypeService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProductTypeCreateInput): Promise<ProductType> {
    // 检查是否存在同名的商品类型（未删除）
    const existing = await this.prisma.productType.findFirst({
      where: {
        name: data.name,
        delete: 0,
      },
    });
    if (existing) {
      throw new BusinessException(
        ErrorCode.DATA_EXIST,
        `商品类型「${data.name}」已存在`,
      );
    }
    return this.prisma.productType.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ProductTypeUpdateInput,
  ): Promise<ProductType> {
    // 如果更新了名称，检查是否与其他商品类型重名
    if (data.name) {
      const nameValue = typeof data.name === 'string' ? data.name : '';
      const existing = await this.prisma.productType.findFirst({
        where: {
          name: nameValue,
          delete: 0,
          id: { not: id }, // 排除自身
        },
      });
      if (existing) {
        throw new BusinessException(
          ErrorCode.DATA_EXIST,
          `商品类型「${nameValue}」已存在`,
        );
      }
    }
    return this.prisma.productType.update({
      where: { id },
      data,
    });
  }

  async list(
    data: ProductTypePageParams,
  ): Promise<ListByPage<ProductTypeListItem[]>> {
    const {
      page,
      pageSize,
      name,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = data;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductTypeWhereInput = {
      delete: 0,
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    // 对于统计字段，需要先获取所有数据进行全局排序，再分页
    if (
      sortField === 'productCount' ||
      sortField === 'orderCount' ||
      sortField === 'orderTotalAmount' ||
      sortField === 'groupBuyCount'
    ) {
      // 获取所有符合条件的商品类型数据（不分页）
      const [allProductTypes, totalCount] = await this.prisma.$transaction([
        this.prisma.productType.findMany({
          where,
          include: {
            product: {
              where: {
                delete: 0,
              },
              include: {
                groupBuy: {
                  where: {
                    delete: 0,
                  },
                  include: {
                    order: {
                      where: {
                        delete: 0,
                        status: {
                          in: [OrderStatus.PAID, OrderStatus.COMPLETED],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.productType.count({ where }),
      ]);

      // 计算每个商品类型的统计数据
      const productTypesWithStats = allProductTypes.map((productType) => {
        let productCount = 0;
        let orderCount = 0;
        let orderTotalAmount = 0;
        let groupBuyCount = 0;

        for (const product of productType.product) {
          productCount++;
          for (const groupBuy of product.groupBuy) {
            groupBuyCount++;
            // 解析units JSON数据
            const units = Array.isArray(groupBuy.units)
              ? (groupBuy.units as GroupBuyUnit[])
              : [];

            for (const order of groupBuy.order) {
              orderCount++;
              // 通过unitId找到对应的unit，计算金额
              const unit = units.find((u) => u.id === order.unitId);
              if (unit) {
                orderTotalAmount += unit.price * order.quantity;
              }
            }
          }
        }

        return {
          ...productType,
          productCount,
          orderCount,
          orderTotalAmount,
          groupBuyCount,
          product: undefined,
        };
      });

      // 全局排序
      const sortedProductTypes = productTypesWithStats.sort((a, b) => {
        const aValue =
          sortField === 'productCount'
            ? a.productCount
            : sortField === 'orderCount'
              ? a.orderCount
              : sortField === 'orderTotalAmount'
                ? a.orderTotalAmount
                : a.groupBuyCount;
        const bValue =
          sortField === 'productCount'
            ? b.productCount
            : sortField === 'orderCount'
              ? b.orderCount
              : sortField === 'orderTotalAmount'
                ? b.orderTotalAmount
                : b.groupBuyCount;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      // 分页处理
      const paginatedProductTypes = sortedProductTypes.slice(
        skip,
        skip + pageSize,
      );

      // 统计无订单商品类型数量（订单量为0的商品类型）
      const noOrderCount = productTypesWithStats.filter(
        (pt) => pt.orderCount === 0,
      ).length;

      return {
        data: paginatedProductTypes,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
      };
    } else {
      // 对于非统计字段（如createdAt），可以直接在数据库层面排序和分页
      let orderBy: Prisma.ProductTypeOrderByWithRelationInput = {
        createdAt: 'desc',
      };
      if (sortField === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      }

      const [productTypes, totalCount] = await this.prisma.$transaction([
        this.prisma.productType.findMany({
          skip: skip,
          take: pageSize,
          orderBy,
          where,
          include: {
            product: {
              where: {
                delete: 0,
              },
              include: {
                groupBuy: {
                  where: {
                    delete: 0,
                  },
                  include: {
                    order: {
                      where: {
                        delete: 0,
                        status: {
                          in: [OrderStatus.PAID, OrderStatus.COMPLETED],
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.productType.count({ where }),
      ]);

      // 计算每个商品类型的统计数据
      const productTypesWithStats = productTypes.map((productType) => {
        let productCount = 0;
        let orderCount = 0;
        let orderTotalAmount = 0;
        let groupBuyCount = 0;

        for (const product of productType.product) {
          productCount++;
          for (const groupBuy of product.groupBuy) {
            groupBuyCount++;
            // 解析units JSON数据
            const units = Array.isArray(groupBuy.units)
              ? (groupBuy.units as GroupBuyUnit[])
              : [];

            for (const order of groupBuy.order) {
              orderCount++;
              // 通过unitId找到对应的unit，计算金额
              const unit = units.find((u) => u.id === order.unitId);
              if (unit) {
                orderTotalAmount += unit.price * order.quantity;
              }
            }
          }
        }

        return {
          ...productType,
          productCount,
          orderCount,
          orderTotalAmount,
          groupBuyCount,
          product: undefined,
        };
      });

      // 统计无订单商品类型数量（订单量为0的商品类型）
      const noOrderCount = productTypesWithStats.filter(
        (pt) => pt.orderCount === 0,
      ).length;

      return {
        data: productTypesWithStats,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
      };
    }
  }

  async listAll() {
    return this.prisma.productType.findMany({
      where: {
        delete: 0,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async detail(id: string) {
    return this.prisma.productType.findUnique({
      where: {
        id,
      },
    });
  }

  async delete(id: string) {
    const productCount = await this.prisma.product.count({
      where: {
        productTypeId: id,
        delete: 0,
      },
    });

    if (productCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该商品类型下存在关联的商品（${productCount}条），无法删除。`,
      );
    }
    return this.prisma.productType.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }

  /**
   * 迁移预览：获取源商品类型下将被迁移的商品列表
   */
  async migratePreview(
    params: ProductTypeMigratePreviewParams,
  ): Promise<ProductTypeMigratePreviewResult> {
    const { sourceId } = params;

    // 校验源商品类型存在且未删除
    const source = await this.prisma.productType.findFirst({
      where: { id: sourceId, delete: 0 },
    });
    if (!source) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '源商品类型不存在',
      );
    }

    // 查询该商品类型下所有未删除的商品
    const products = await this.prisma.product.findMany({
      where: { productTypeId: sourceId, delete: 0 },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' },
    });

    return {
      sourceId,
      sourceName: source.name,
      products,
    };
  }

  /**
   * 迁移：将源商品类型下的所有商品迁移到目标商品类型，并删除源商品类型
   */
  async migrate(
    params: ProductTypeMigrateParams,
  ): Promise<ProductTypeMigrateResult> {
    const { sourceId, targetId } = params;

    // 校验源和目标不能相同
    if (sourceId === targetId) {
      throw new BusinessException(ErrorCode.INVALID_INPUT, '源和目标不能相同');
    }

    // 校验源商品类型存在且未删除
    const source = await this.prisma.productType.findFirst({
      where: { id: sourceId, delete: 0 },
    });
    if (!source) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '源商品类型不存在',
      );
    }

    // 校验目标商品类型存在且未删除
    const target = await this.prisma.productType.findFirst({
      where: { id: targetId, delete: 0 },
    });
    if (!target) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '目标商品类型不存在',
      );
    }

    // 使用事务：迁移商品 + 软删除源商品类型
    const result = await this.prisma.$transaction(async (tx) => {
      // 迁移：更新所有商品的 productTypeId
      const updateResult = await tx.product.updateMany({
        where: { productTypeId: sourceId, delete: 0 },
        data: { productTypeId: targetId },
      });

      // 软删除源商品类型
      await tx.productType.update({
        where: { id: sourceId },
        data: { delete: 1 },
      });

      return updateResult.count;
    });

    return { migratedCount: result };
  }
}
