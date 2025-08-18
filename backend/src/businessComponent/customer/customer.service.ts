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
            latestGroupBuyStartDate: Date;
          }
        >;
      }
    > = {};

    for (const order of orders) {
      const units = order.groupBuy.units as GroupBuyUnit[];
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        const orderAmount = unit.price * order.quantity;
        totalAmount += orderAmount;

        // 统计团购数据的key
        const groupBuyKey = `${order.groupBuy.name}-${unit.unit}`;

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
            latestGroupBuyStartDate: order.groupBuy.groupBuyStartDate,
          };
        } else {
          // 更新最近一次团购发起时间（取最新的时间）
          const currentStartDate = new Date(order.groupBuy.groupBuyStartDate);
          const existingStartDate = new Date(
            productCounts[order.groupBuy.productId].groupBuys[
              groupBuyKey
            ].latestGroupBuyStartDate,
          );
          if (currentStartDate > existingStartDate) {
            productCounts[order.groupBuy.productId].groupBuys[
              groupBuyKey
            ].latestGroupBuyStartDate = order.groupBuy.groupBuyStartDate;
          }
        }

        productCounts[order.groupBuy.productId].groupBuys[groupBuyKey].count++;
        productCounts[order.groupBuy.productId].groupBuys[
          groupBuyKey
        ].totalAmount += orderAmount;
      }
    }

    const averagePricePerOrder = totalAmount / orderCount;

    // 找到全局最新的团购时间（用于标识最新消费）
    // 先找到所有商品中最新的团购发起时间，如果发起时间相同则对比创建时间
    let globalLatestDate: Date | null = null;
    let globalLatestCreatedAt: Date | null = null;

    // 获取所有团购的发起时间和创建时间用于比较
    const allGroupBuyDates: Array<{ startDate: Date; createdAt: Date }> = [];

    for (const order of orders) {
      allGroupBuyDates.push({
        startDate: order.groupBuy.groupBuyStartDate,
        createdAt: order.groupBuy.createdAt,
      });
    }

    // 找到全局最新的团购（优先按发起时间，发起时间相同则按创建时间）
    for (const { startDate, createdAt } of allGroupBuyDates) {
      if (
        !globalLatestDate ||
        startDate > globalLatestDate ||
        (startDate.getTime() === globalLatestDate.getTime() &&
          (!globalLatestCreatedAt || createdAt > globalLatestCreatedAt))
      ) {
        globalLatestDate = startDate;
        globalLatestCreatedAt = createdAt;
      }
    }

    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => {
        // 计算每个商品的总消费金额
        const totalAmountA = Object.values(a.groupBuys).reduce(
          (sum, gb) => sum + gb.totalAmount,
          0,
        );
        const totalAmountB = Object.values(b.groupBuys).reduce(
          (sum, gb) => sum + gb.totalAmount,
          0,
        );
        // 按照总消费金额从高到低排序
        return totalAmountB - totalAmountA;
      })
      .slice(0, 5)
      .map(([productId, { name, count, groupBuys }]) => {
        // 找到该商品中最新的团购时间和创建时间
        let productLatestDate: Date | null = null;
        let productLatestCreatedAt: Date | null = null;

        // 从该商品的所有团购中找到最新的
        const productGroupBuys = Object.values(groupBuys);
        for (const gb of productGroupBuys) {
          // 需要从原始订单中找到对应的创建时间
          const matchingOrders = orders.filter(
            (order) =>
              order.groupBuy.name === gb.groupBuyName &&
              order.groupBuy.groupBuyStartDate.getTime() ===
                gb.latestGroupBuyStartDate.getTime(),
          );

          for (const order of matchingOrders) {
            const startDate = order.groupBuy.groupBuyStartDate;
            const createdAt = order.groupBuy.createdAt;

            if (
              !productLatestDate ||
              startDate > productLatestDate ||
              (startDate.getTime() === productLatestDate.getTime() &&
                (!productLatestCreatedAt || createdAt > productLatestCreatedAt))
            ) {
              productLatestDate = startDate;
              productLatestCreatedAt = createdAt;
            }
          }
        }

        // 判断当前商品是否包含最新消费
        const isLatestConsumption =
          productLatestDate &&
          globalLatestDate &&
          globalLatestCreatedAt &&
          productLatestCreatedAt &&
          productLatestDate.getTime() === globalLatestDate.getTime() &&
          productLatestCreatedAt.getTime() === globalLatestCreatedAt.getTime();

        return {
          productId,
          productName: name,
          count,
          isLatestConsumption: !!isLatestConsumption,
          groupBuys: Object.values(groupBuys).sort((a, b) => {
            // 按照最近参与时间倒序排列（最新的在前）
            const dateA = new Date(a.latestGroupBuyStartDate);
            const dateB = new Date(b.latestGroupBuyStartDate);
            return dateB.getTime() - dateA.getTime();
          }),
        };
      });

    return {
      customerName: customer.name,
      orderCount,
      totalAmount,
      averagePricePerOrder,
      topProducts,
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
                      in: [OrderStatus.PAID, OrderStatus.COMPLETED],
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
                in: [OrderStatus.PAID, OrderStatus.COMPLETED],
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
                      in: [OrderStatus.PAID, OrderStatus.COMPLETED],
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
                in: [OrderStatus.PAID, OrderStatus.COMPLETED],
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
