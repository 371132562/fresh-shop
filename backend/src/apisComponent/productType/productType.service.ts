import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ProductType, Prisma } from '@prisma/client';

import { ProductTypePageParams, ListByPage } from '../../../types/dto';
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

  async list(data: ProductTypePageParams): Promise<ListByPage<ProductType[]>> {
    const { page, pageSize, name } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: any = {
      delete: 0, // 仅查询未删除的供货商
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    const [productType, totalCount] = await this.prisma.$transaction([
      this.prisma.productType.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
      }),
      this.prisma.productType.count({ where }), // 获取总记录数
    ]);

    return {
      data: productType,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async listAll() {
    return this.prisma.productType.findMany({
      where: {
        delete: 0,
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
        '该商品类型下存在关联的商品，无法删除。',
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
