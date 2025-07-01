import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Customer } from '@prisma/client';

import { CustomerPageParams, ListByPage } from '../../types/dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(data: Customer): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async update(id: string, data: Customer): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async list(data: CustomerPageParams): Promise<ListByPage<Customer[]>> {
    const { page, pageSize, name, customerAddressIds } = data; // 从 data 中解构 customerAddressIds
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: any = {
      delete: 0, // 仅查询未删除的供货商
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (customerAddressIds && customerAddressIds.length > 0) {
      where.customerAddressId = {
        in: customerAddressIds, // 使用 Prisma 的 in 操作符
      };
    }

    const [customer, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
        include: {
          // 新增：包含 customerAddress 信息
          customerAddress: {
            select: {
              name: true, // 只选择 customerAddress 的 name 字段
            },
          },
        },
      }),
      this.prisma.customer.count({ where }), // 获取总记录数
    ]);

    return {
      data: customer.map((customer) => ({
        // 映射结果，将 customerAddress.name 添加到每个产品对象中
        ...customer,
        customerAddressName: customer.customerAddress?.name, // 添加 customerAddressName
        customerAddress: undefined, // 移除原始的 customerAddress 对象，如果不需要
      })),
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string) {
    return this.prisma.customer.findUnique({
      where: {
        id,
      },
    });
  }

  async delete(id: string) {
    return this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }
}
