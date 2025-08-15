import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Customer, Prisma } from '@prisma/client';

import {
  CustomerPageParams,
  ListByPage,
  GroupBuyUnit,
  CustomerConsumptionDetailDto,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async getConsumptionDetail(
    id: string,
  ): Promise<CustomerConsumptionDetailDto> {
    const orders = await this.prisma.order.findMany({
      where: {
        customerId: id,
        delete: 0,
      },
      include: {
        groupBuy: {
          include: {
            product: true,
          },
        },
      },
    });

    const orderCount = orders.length;
    if (orderCount === 0) {
      return {
        orderCount: 0,
        totalAmount: 0,
        averagePricePerOrder: 0,
        topProducts: [],
        topGroupBuys: [],
      };
    }

    let totalAmount = 0;
    const productCounts: Record<string, { name: string; count: number }> = {};
    const groupBuyCounts: Record<string, number> = {};

    for (const order of orders) {
      const units = order.groupBuy.units as GroupBuyUnit[];
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        totalAmount += unit.price * order.quantity;
      }

      const productName = order.groupBuy.product.name;
      if (productCounts[order.groupBuy.productId]) {
        productCounts[order.groupBuy.productId].count++;
      } else {
        productCounts[order.groupBuy.productId] = {
          name: productName,
          count: 1,
        };
      }

      const groupBuyName = order.groupBuy.name;
      if (groupBuyCounts[groupBuyName]) {
        groupBuyCounts[groupBuyName]++;
      } else {
        groupBuyCounts[groupBuyName] = 1;
      }
    }

    const averagePricePerOrder = totalAmount / orderCount;

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        count: data.count,
      }));

    const topGroupBuys = Object.entries(groupBuyCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([groupBuyName, count]) => ({
        groupBuyName,
        count,
      }));

    return {
      orderCount,
      totalAmount,
      averagePricePerOrder,
      topProducts,
      topGroupBuys,
    };
  }

  async create(data: Prisma.CustomerCreateInput): Promise<Customer> {
    const { name, phone, wechat } = data;
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        delete: 0,
        OR: [{ name: name }, { phone: phone }, { wechat: wechat }],
      },
    });

    if (existingCustomer) {
      if (existingCustomer.name === name) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '客户名称已存在');
      }
      if (existingCustomer.phone === phone) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '客户电话已存在');
      }
      if (existingCustomer.wechat === wechat) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '客户微信已存在');
      }
    }
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
    const {
      page,
      pageSize,
      name,
      phone,
      wechat,
      customerAddressIds,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = data;
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

    // 根据排序字段构建orderBy
    let orderBy: Prisma.CustomerOrderByWithRelationInput = {
      createdAt: 'desc',
    };
    if (sortField === 'createdAt') {
      orderBy = { createdAt: sortOrder };
    }
    // 注意：orderCount 和 orderTotalAmount 需要在查询后进行排序，因为它们是计算字段

    const [customers, totalCount] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        skip: skip,
        take: pageSize,
        orderBy: orderBy,
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

    // 使用dto.ts中定义的GroupBuyUnit类型

    // 计算每个客户的订单总额
    const customersWithTotalAmount = await Promise.all(
      customers.map(async (customer) => {
        // 获取该客户所有订单的详细信息来计算总金额
        const orders = await this.prisma.order.findMany({
          where: {
            customerId: customer.id,
            delete: 0,
          },
          include: {
            groupBuy: {
              select: {
                units: true,
              },
            },
          },
        });

        // 计算总金额
        let totalAmount = 0;
        orders.forEach((order) => {
          const units = order.groupBuy.units as GroupBuyUnit[];
          const unit = units.find((u) => u.id === order.unitId);
          if (unit) {
            totalAmount += unit.price * order.quantity;
          }
        });

        return {
          ...customer,
          customerAddressName: customer.customerAddress?.name,
          customerAddress: undefined,
          orderCount: customer._count.orders,
          orderTotalAmount: totalAmount,
        };
      }),
    );

    // 如果是按计算字段排序，需要在这里进行排序
    let sortedCustomers = customersWithTotalAmount;
    if (sortField === 'orderCount' || sortField === 'orderTotalAmount') {
      sortedCustomers = customersWithTotalAmount.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    return {
      data: sortedCustomers,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
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
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
