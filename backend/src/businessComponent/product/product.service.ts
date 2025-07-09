import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Product, Prisma } from '@prisma/client';

import { ProductPageParams, ListByPage } from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async list(data: ProductPageParams): Promise<ListByPage<Product[]>> {
    const { page, pageSize, name, productTypeIds } = data; // 从 data 中解构 productTypeIds
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.ProductWhereInput = {
      delete: 0, // 仅查询未删除的商品
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (productTypeIds && productTypeIds.length > 0) {
      where.productTypeId = {
        in: productTypeIds, // 使用 Prisma 的 in 操作符
      };
    }

    const [product, totalCount] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
        include: {
          // 新增：包含 productType 信息
          productType: {
            select: {
              name: true, // 只选择 productType 的 name 字段
            },
          },
        },
      }),
      this.prisma.product.count({ where }), // 获取总记录数
    ]);

    return {
      data: product.map((product) => ({
        // 映射结果，将 productType.name 添加到每个产品对象中
        ...product,
        productTypeName: product.productType?.name, // 添加 productTypeName
        productType: undefined, // 移除原始的 productType 对象，如果不需要
      })),
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string) {
    return this.prisma.product.findUnique({
      where: {
        id,
      },
    });
  }

  async delete(id: string) {
    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        productId: id,
        delete: 0,
      },
    });

    if (groupBuyCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该商品下存在关联的团购单（${groupBuyCount}条），无法删除。`,
      );
    }
    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }

  async listAll() {
    return this.prisma.product.findMany({
      where: {
        delete: 0,
      },
    });
  }
}
