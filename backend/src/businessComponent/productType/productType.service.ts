import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductType, Prisma, OrderStatus } from '@prisma/client';

import {
  ProductTypePageParams,
  ListByPage,
  ProductTypeListItem,
  GroupBuyUnit,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class ProductTypeService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProductTypeCreateInput): Promise<ProductType> {
    return this.prisma.productType.create({ data });
  }

  async update(
    id: string,
    data: Prisma.ProductTypeUpdateInput,
  ): Promise<ProductType> {
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
}
