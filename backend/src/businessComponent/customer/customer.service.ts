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
      select: {
        quantity: true,
        unitId: true,
        partialRefundAmount: true, // 添加部分退款金额字段
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
        totalPartialRefundAmount: 0,
        productConsumptionRanks: [],
      };
    }

    let totalAmount = 0;
    let totalPartialRefundAmount = 0;
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
            totalPartialRefundAmount: number;
            latestGroupBuyStartDate: Date;
          }
        >;
      }
    > = {};

    for (const order of orders) {
      const units = order.groupBuy.units as GroupBuyUnit[];
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        const originalAmount = unit.price * order.quantity;
        const partialRefundAmount = order.partialRefundAmount || 0;
        const orderAmount = originalAmount - partialRefundAmount;
        totalAmount += orderAmount;
        totalPartialRefundAmount += partialRefundAmount;

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
            totalPartialRefundAmount: 0,
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
        productCounts[order.groupBuy.productId].groupBuys[
          groupBuyKey
        ].totalPartialRefundAmount += partialRefundAmount;
      }
    }

    const averagePricePerOrder = totalAmount / orderCount;

    // 找到全局最新的团购发起时间（用于标识最新消费）
    let globalLatestDate: Date | null = null;
    for (const order of orders) {
      const startDate = order.groupBuy.groupBuyStartDate;

      if (!globalLatestDate || startDate > globalLatestDate) {
        globalLatestDate = startDate;
      }
    }

    // 当存在多个同一天的团购时，再细分比较创建时间，找出该天中最新创建的时间
    let globalLatestCreatedAt: Date | null = null;
    if (globalLatestDate) {
      for (const order of orders) {
        if (
          order.groupBuy.groupBuyStartDate.getTime() ===
          globalLatestDate.getTime()
        ) {
          const createdAt = order.groupBuy.createdAt;
          if (!globalLatestCreatedAt || createdAt > globalLatestCreatedAt) {
            globalLatestCreatedAt = createdAt;
          }
        }
      }
    }

    const productConsumptionRanks = Object.entries(productCounts)
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
      .map(([productId, { name, count, groupBuys }]) => {
        // 找到该商品中最新的团购发起时间
        let productLatestDate: Date | null = null;

        // 从该商品的所有团购中找到最新的发起时间
        const productGroupBuys = Object.values(groupBuys);
        for (const gb of productGroupBuys) {
          const startDate = gb.latestGroupBuyStartDate;

          if (!productLatestDate || startDate > productLatestDate) {
            productLatestDate = startDate;
          }
        }

        // 基于发起时间进行初次判定
        let isLatestConsumption =
          !!productLatestDate &&
          !!globalLatestDate &&
          productLatestDate.getTime() === globalLatestDate.getTime();

        // 当发起时间相同可能存在多个“最新”，此时使用创建时间做二次细分
        if (isLatestConsumption && globalLatestCreatedAt && productLatestDate) {
          let productLatestCreatedAt: Date | null = null;
          // 在该商品、该发起日期下找到创建时间的最大值
          for (const order of orders) {
            if (
              order.groupBuy.productId === productId &&
              order.groupBuy.groupBuyStartDate.getTime() ===
                productLatestDate.getTime()
            ) {
              const createdAt = order.groupBuy.createdAt;
              if (
                !productLatestCreatedAt ||
                createdAt > productLatestCreatedAt
              ) {
                productLatestCreatedAt = createdAt;
              }
            }
          }

          isLatestConsumption =
            !!productLatestCreatedAt &&
            productLatestCreatedAt.getTime() ===
              globalLatestCreatedAt.getTime();
        }

        return {
          productId,
          productName: name,
          count,
          isLatestConsumption,
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
      totalPartialRefundAmount,
      productConsumptionRanks,
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
            select: {
              quantity: true,
              unitId: true,
              partialRefundAmount: true, // 添加部分退款金额字段
              groupBuy: {
                select: {
                  units: true,
                },
              },
            },
          });

          // 计算总金额（扣除部分退款）
          let totalAmount = 0;
          orders.forEach((order) => {
            const units = order.groupBuy.units as GroupBuyUnit[];
            const unit = units.find((u) => u.id === order.unitId);
            if (unit) {
              const originalAmount = unit.price * order.quantity;
              totalAmount += originalAmount - (order.partialRefundAmount || 0);
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
            select: {
              quantity: true,
              unitId: true,
              partialRefundAmount: true,
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
              const originalAmount = unit.price * order.quantity;
              const partialRefundAmount = order.partialRefundAmount || 0;
              const orderAmount = originalAmount - partialRefundAmount;
              totalAmount += orderAmount;
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
