import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddress, Prisma } from '@prisma/client';

import { CustomerAddressPageParams, ListByPage } from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class CustomerAddressService {
  constructor(private prisma: PrismaService) {}

  async create(
    data: Prisma.CustomerAddressCreateInput,
  ): Promise<CustomerAddress> {
    return this.prisma.customerAddress.create({ data });
  }

  async update(
    id: string,
    data: Prisma.CustomerAddressUpdateInput,
  ): Promise<CustomerAddress> {
    return this.prisma.customerAddress.update({
      where: { id },
      data,
    });
  }

  async list(
    data: CustomerAddressPageParams,
  ): Promise<ListByPage<CustomerAddress[]>> {
    const { page, pageSize, name } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.CustomerAddressWhereInput = {
      delete: 0, // 仅查询未删除的客户地址
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    const [customerAddress, totalCount] = await this.prisma.$transaction([
      this.prisma.customerAddress.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
      }),
      this.prisma.customerAddress.count({ where }), // 获取总记录数
    ]);

    return {
      data: customerAddress,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async listAll() {
    return this.prisma.customerAddress.findMany({
      where: {
        delete: 0,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async detail(id: string) {
    return this.prisma.customerAddress.findUnique({
      where: {
        id,
      },
    });
  }

  async delete(id: string) {
    const customerCount = await this.prisma.customer.count({
      where: {
        customerAddressId: id,
        delete: 0,
      },
    });

    if (customerCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该客户地址下存在关联的客户（${customerCount}条），无法删除。`,
      );
    }
    return this.prisma.customerAddress.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }
}
