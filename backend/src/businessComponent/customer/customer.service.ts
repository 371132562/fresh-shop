import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Customer, Prisma, OrderStatus } from '@prisma/client';

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
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '客户不存在');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        customerId: id,
        delete: 0,
        status: {
          in: [OrderStatus.PAID, OrderStatus.COMPLETED],
        },
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
        customerName: customer.name,
        orderCount: 0,
        totalAmount: 0,
        averagePricePerOrder: 0,
        topProducts: [],
        topGroupBuys: [],
      };
    }

    let totalAmount = 0;
    const productCounts: Record<
      string,
      {
        name: string;
        count: number;
        groupBuys: Record<
          string,
          {
            groupBuyName: string;
            unitName: string;
            count: number;
            totalAmount: number;
          }
        >;
      }
    > = {};
    const groupBuyCounts: Record<
      string,
      { name: string; unit: string; count: number }
    > = {};

    for (const order of orders) {
      const units = order.groupBuy.units as GroupBuyUnit[];
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        const orderAmount = unit.price * order.quantity;
        totalAmount += orderAmount;

        // 统计团购数据（保留原有逻辑用于兼容性）
        const groupBuyKey = `${order.groupBuy.name}-${unit.unit}`;
        if (groupBuyCounts[groupBuyKey]) {
          groupBuyCounts[groupBuyKey].count++;
        } else {
          groupBuyCounts[groupBuyKey] = {
            name: order.groupBuy.name,
            unit: unit.unit,
            count: 1,
          };
        }

        // 统计商品及其团购数据
        const productName = order.groupBuy.product.name;
        if (!productCounts[order.groupBuy.productId]) {
          productCounts[order.groupBuy.productId] = {
            name: productName,
            count: 0,
            groupBuys: {},
          };
        }

        productCounts[order.groupBuy.productId].count++;

        // 在商品下统计团购数据
        if (!productCounts[order.groupBuy.productId].groupBuys[groupBuyKey]) {
          productCounts[order.groupBuy.productId].groupBuys[groupBuyKey] = {
            groupBuyName: order.groupBuy.name,
            unitName: unit.unit,
            count: 0,
            totalAmount: 0,
          };
        }

        productCounts[order.groupBuy.productId].groupBuys[groupBuyKey].count++;
        productCounts[order.groupBuy.productId].groupBuys[
          groupBuyKey
        ].totalAmount += orderAmount;
      }
    }

    const averagePricePerOrder = totalAmount / orderCount;

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([productId, { name, count, groupBuys }]) => ({
        productId,
        productName: name,
        count,
        groupBuys: Object.values(groupBuys).sort((a, b) => b.count - a.count),
      }));

    const topGroupBuys = Object.values(groupBuyCounts)
      .sort((a, b) => b.count - a.count)
      .map((data) => ({
        groupBuyName: data.name,
        unitName: data.unit,
        count: data.count,
      }));

    return {
      customerName: customer.name,
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

    // 对于计算字段（orderCount、orderTotalAmount），需要先获取所有数据进行排序，再分页
    if (sortField === 'orderCount' || sortField === 'orderTotalAmount') {
      // 获取所有符合条件的客户数据（不分页）
      const [allCustomers, totalCount] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          where,
          include: {
            customerAddress: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                orders: {
                  where: {
                    delete: 0,
                    status: {
                      in: ['PAID', 'COMPLETED'],
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.customer.count({ where }),
      ]);

      // 计算每个客户的订单总额
      const customersWithTotalAmount = await Promise.all(
        allCustomers.map(async (customer) => {
          // 获取该客户所有订单的详细信息来计算总金额
          const orders = await this.prisma.order.findMany({
            where: {
              customerId: customer.id,
              delete: 0,
              status: {
                in: ['PAID', 'COMPLETED'],
              },
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

      // 全局排序
      const sortedCustomers = customersWithTotalAmount.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      // 分页处理
      const paginatedCustomers = sortedCustomers.slice(skip, skip + pageSize);

      return {
        data: paginatedCustomers,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    } else {
      // 对于非计算字段（如createdAt），可以直接在数据库层面排序和分页
      let orderBy: Prisma.CustomerOrderByWithRelationInput = {
        createdAt: 'desc',
      };
      if (sortField === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      }

      const [customers, totalCount] = await this.prisma.$transaction([
        this.prisma.customer.findMany({
          skip: skip,
          take: pageSize,
          orderBy: orderBy,
          where,
          include: {
            customerAddress: {
              select: {
                name: true,
              },
            },
            _count: {
              select: {
                orders: {
                  where: {
                    delete: 0,
                    status: {
                      in: ['PAID', 'COMPLETED'],
                    },
                  },
                },
              },
            },
          },
        }),
        this.prisma.customer.count({ where }),
      ]);

      // 计算每个客户的订单总额（仅对当前页数据）
      const customersWithTotalAmount = await Promise.all(
        customers.map(async (customer) => {
          const orders = await this.prisma.order.findMany({
            where: {
              customerId: customer.id,
              delete: 0,
              status: {
                in: ['PAID', 'COMPLETED'],
              },
            },
            include: {
              groupBuy: {
                select: {
                  units: true,
                },
              },
            },
          });

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

      return {
        data: customersWithTotalAmount,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
      };
    }
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
