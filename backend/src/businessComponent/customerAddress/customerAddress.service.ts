import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddress, Prisma, OrderStatus } from '@prisma/client';

import {
  CustomerAddressPageParams,
  ListByPage,
  CustomerAddressListItem,
  GroupBuyUnit,
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
          });

          return {
            ...address,
            orderCount: orders.length,
            orderTotalAmount: totalAmount,
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

      return {
        data: paginatedAddresses,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
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
          });

          return {
            ...address,
            orderCount: orders.length,
            orderTotalAmount: totalAmount,
          };
        }),
      );

      return {
        data: customerAddressesWithStats,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
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
}
