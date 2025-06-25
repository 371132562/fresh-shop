import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Supplier } from '@prisma/client';

import { PageParams, ListByPage } from 'fresh-shop-common/types/dto';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async create(data: Supplier): Promise<{ id: string }> {
    return await this.prisma.supplier.create({ data });
  }

  async list(data: PageParams): Promise<ListByPage<Supplier[]>> {
    const { page, pageSize } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const [suppliers, totalCount] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
      }),
      this.prisma.supplier.count(), // 获取总记录数
    ]);

    return {
      data: suppliers,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }
}
