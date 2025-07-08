import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Customer, Prisma } from '@prisma/client';

import { CustomerPageParams, ListByPage } from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    return this.prisma.customer.create({ data });
  }

  async update(
    id: string,
    data: Prisma.CustomerUpdateInput,
  ): Promise<Customer> {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async list(data: CustomerPageParams): Promise<ListByPage<Customer[]>> {
    const { page, pageSize, name, phone, wechat, customerAddressIds } = data;
    const skip = (page - 1) * pageSize;

    const where: Prisma.CustomerWhereInput = {
      delete: 0,
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (phone) {
      where.phone = {
        contains: phone,
      };
    }

    if (wechat) {
      where.wechat = {
        contains: wechat,
      };
    }

    if (customerAddressIds && customerAddressIds.length > 0) {
      where.customerAddressId = {
        in: customerAddressIds,
      };
    }

    const [customers, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc',
        },
        where,
        include: {
          // 新增：包含 customerAddress 信息
          customerAddress: {
            select: {
              name: true, // 只选择 customerAddress 的 name 字段
            },
          },
          _count: {
            select: {
              orders: {
                where: {
                  delete: 0,
                },
              },
            },
          },
        },
      }),
      this.prisma.customer.count({ where }), // 获取总记录数
    ]);

    return {
      data: customers.map((customer) => ({
        // 映射结果，将 customerAddress.name 添加到每个产品对象中
        ...customer,
        customerAddressName: customer.customerAddress?.name, // 添加 customerAddressName
        customerAddress: undefined, // 移除原始的 customerAddress 对象，如果不需要
        orderCount: customer._count.orders,
      })),
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string): Promise<Customer | null> {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  async delete(id: string) {
    const orderCount = await this.prisma.order.count({
      where: {
        customerId: id,
        delete: 0,
      },
    });

    if (orderCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该客户下存在关联的订单（${orderCount}条），无法删除。`,
      );
    }
    return this.prisma.customer.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }

  async listAll(): Promise<Customer[]> {
    return this.prisma.customer.findMany({
      where: {
        delete: 0,
      },
    });
  }
}
