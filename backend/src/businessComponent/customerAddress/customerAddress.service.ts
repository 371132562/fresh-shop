import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddress, Prisma, OrderStatus } from '@prisma/client';

import {
  CustomerAddressPageParams,
  ListByPage,
  CustomerAddressListItem,
  GroupBuyUnit,
  AddressOverviewParams,
  AddressOverviewResult,
  AddressOverviewListItem,
} from '../../../types/dto';
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
  ): Promise<ListByPage<CustomerAddressListItem[]>> {
    const {
      page,
      pageSize,
      name,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.CustomerAddressWhereInput = {
      delete: 0, // 仅查询未删除的客户地址
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    // 对于计算字段（orderCount、orderTotalAmount），需要先获取所有数据进行排序，再分页
    if (sortField === 'orderCount' || sortField === 'orderTotalAmount') {
      // 获取所有符合条件的地址数据（不分页）
      const [allAddresses, totalCount] = await this.prisma.$transaction([
        this.prisma.customerAddress.findMany({
          where,
        }),
        this.prisma.customerAddress.count({ where }),
      ]);

      // 计算每个地址的订单统计
      const addressesWithStats = await Promise.all(
        allAddresses.map(async (address) => {
          // 获取该地址下所有客户的订单
          const orders = await this.prisma.order.findMany({
            where: {
              customer: {
                customerAddressId: address.id,
                delete: 0,
              },
              delete: 0,
              status: {
                in: [
                  OrderStatus.PAID,
                  OrderStatus.COMPLETED,
                  OrderStatus.REFUNDED,
                ],
              },
            },
            select: {
              quantity: true,
              unitId: true,
              partialRefundAmount: true,
              status: true,
              groupBuy: {
                select: {
                  units: true,
                },
              },
            },
          });

          // 计算订单总额（扣除部分退款；已退款订单不计入消费额）
          let totalAmount = 0;
          // 有效订单数（仅 PAID/COMPLETED，用于"无订单"统计）
          let validOrderCount = 0;
          orders.forEach((order) => {
            const units = order.groupBuy.units as GroupBuyUnit[];
            const unit = units.find((u) => u.id === order.unitId);
            if (unit) {
              const originalAmount = unit.price * order.quantity;
              const partialRefundAmount = order.partialRefundAmount || 0;
              const orderAmount =
                order.status === OrderStatus.REFUNDED
                  ? 0
                  : originalAmount - partialRefundAmount;
              totalAmount += orderAmount;
            }
            // 统计有效订单数
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              validOrderCount++;
            }
          });

          return {
            ...address,
            orderCount: orders.length,
            orderTotalAmount: totalAmount,
            validOrderCount, // 用于"无订单"统计
          };
        }),
      );

      // 全局排序
      const sortedAddresses = addressesWithStats.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];
        if (sortOrder === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });

      // 分页处理
      const paginatedAddresses = sortedAddresses.slice(skip, skip + pageSize);

      // 统计无订单地址数量（没有有效订单 PAID/COMPLETED 的地址）
      const noOrderCount = addressesWithStats.filter(
        (addr) => addr.validOrderCount === 0,
      ).length;

      // 移除 validOrderCount 字段，不返回给前端
      const result = paginatedAddresses.map(
        ({ validOrderCount: _, ...rest }) => rest,
      );

      return {
        data: result,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
      };
    } else {
      // 对于非计算字段（如createdAt），可以直接在数据库层面排序和分页
      let orderBy: Prisma.CustomerAddressOrderByWithRelationInput = {
        createdAt: 'desc',
      };
      if (sortField === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      }

      const [customerAddresses, totalCount] = await this.prisma.$transaction([
        this.prisma.customerAddress.findMany({
          skip: skip,
          take: pageSize,
          orderBy: orderBy,
          where,
        }),
        this.prisma.customerAddress.count({ where }), // 获取总记录数
      ]);

      // 计算每个地址的订单统计（仅对当前页数据）
      const customerAddressesWithStats = await Promise.all(
        customerAddresses.map(async (address) => {
          // 获取该地址下所有客户的订单
          const orders = await this.prisma.order.findMany({
            where: {
              customer: {
                customerAddressId: address.id,
                delete: 0,
              },
              delete: 0,
              status: {
                in: [
                  OrderStatus.PAID,
                  OrderStatus.COMPLETED,
                  OrderStatus.REFUNDED,
                ],
              },
            },
            select: {
              quantity: true,
              unitId: true,
              partialRefundAmount: true,
              status: true,
              groupBuy: {
                select: {
                  units: true,
                },
              },
            },
          });

          // 计算订单总额（扣除部分退款；已退款订单不计入消费额）
          let totalAmount = 0;
          // 有效订单数（仅 PAID/COMPLETED，用于"无订单"统计）
          let validOrderCount = 0;
          orders.forEach((order) => {
            const units = order.groupBuy.units as GroupBuyUnit[];
            const unit = units.find((u) => u.id === order.unitId);
            if (unit) {
              const originalAmount = unit.price * order.quantity;
              const partialRefundAmount = order.partialRefundAmount || 0;
              const orderAmount =
                order.status === OrderStatus.REFUNDED
                  ? 0
                  : originalAmount - partialRefundAmount;
              totalAmount += orderAmount;
            }
            // 统计有效订单数
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              validOrderCount++;
            }
          });

          return {
            ...address,
            orderCount: orders.length,
            orderTotalAmount: totalAmount,
            validOrderCount, // 用于"无订单"统计
          };
        }),
      );

      // 统计无订单地址数量（没有有效订单 PAID/COMPLETED 的地址）
      const noOrderCount = customerAddressesWithStats.filter(
        (addr) => addr.validOrderCount === 0,
      ).length;

      // 移除 validOrderCount 字段，不返回给前端
      const result = customerAddressesWithStats.map(
        ({ validOrderCount: _, ...rest }) => rest,
      );

      return {
        data: result,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
        noOrderCount,
      };
    }
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

  // 地址概况：按地址聚合订单金额与数量，并支持时间范围/搜索/排序/分页
  async getAddressOverview(
    params: AddressOverviewParams,
  ): Promise<AddressOverviewResult> {
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      addressName = '',
      sortField = 'totalRevenue',
      sortOrder = 'desc',
    } = params;

    const whereOrder: Prisma.OrderWhereInput = {
      delete: 0,
      status: {
        in: [OrderStatus.PAID, OrderStatus.COMPLETED, OrderStatus.REFUNDED],
      },
      ...(startDate && endDate
        ? {
            groupBuy: {
              groupBuyStartDate: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            },
          }
        : {}),
      customer: {
        delete: 0,
        ...(addressName
          ? {
              customerAddress: {
                name: { contains: addressName },
                delete: 0,
              },
            }
          : {
              customerAddress: { delete: 0 },
            }),
      },
    };

    // 拉取相关订单（仅必要字段），在内存中聚合金额（考虑退款口径）与计数
    const orders = await this.prisma.order.findMany({
      where: whereOrder,
      orderBy: {
        groupBuy: {
          groupBuyStartDate: 'desc',
        },
      },
      select: {
        quantity: true,
        unitId: true,
        partialRefundAmount: true,
        status: true,
        customer: {
          select: {
            customerAddressId: true,
            customerAddress: { select: { name: true } },
          },
        },
        groupBuy: { select: { units: true } },
      },
    });

    type Agg = {
      addressId: string;
      addressName: string;
      totalRevenue: number;
      totalOrderCount: number;
      totalRefundAmount: number;
    };
    const aggMap = new Map<string, Agg>();

    for (const o of orders) {
      if (!o.customer?.customerAddressId) continue;

      const units = (o.groupBuy.units as unknown as Array<GroupBuyUnit>) || [];
      const unit = units.find((u) => u.id === o.unitId);
      if (!unit) continue;
      const originalRevenue = unit.price * o.quantity;
      const partial = o.partialRefundAmount || 0;

      const addressId = o.customer.customerAddressId;
      if (!aggMap.has(addressId)) {
        aggMap.set(addressId, {
          addressId: addressId,
          addressName: o.customer.customerAddress?.name || '未知地址',
          totalRevenue: 0,
          totalOrderCount: 0,
          totalRefundAmount: 0,
        });
      }
      const agg = aggMap.get(addressId)!;

      // 已支付/已完成订单：销售额扣除部分退款，计入订单量
      if (o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED) {
        const revenue = originalRevenue - partial;
        agg.totalRevenue += revenue;
        agg.totalOrderCount += 1;
        agg.totalRefundAmount += partial; // 部分退款
      }
      // 已退款订单：销售额为0，不计入订单量，但计入退款金额
      else if (o.status === OrderStatus.REFUNDED) {
        agg.totalRefundAmount += originalRevenue; // 全额退款
      }
    }

    let list: AddressOverviewListItem[] = Array.from(aggMap.values()).map(
      (x) => ({
        addressId: x.addressId,
        addressName: x.addressName,
        totalRevenue: x.totalRevenue,
        totalOrderCount: x.totalOrderCount,
        averageOrderAmount: x.totalOrderCount
          ? x.totalRevenue / x.totalOrderCount
          : 0,
        totalRefundAmount: x.totalRefundAmount,
      }),
    );

    // 排序
    list.sort((a, b) => {
      const field = sortField;
      const av = a[field];
      const bv = b[field];
      return sortOrder === 'asc' ? av - bv : bv - av;
    });

    const total = list.length;
    const start = (page - 1) * pageSize;
    const endIdx = start + pageSize;
    list = list.slice(start, endIdx);

    return { list, total, page, pageSize };
  }
}
