import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CustomerAddress, Prisma, OrderStatus } from '@prisma/client';

import {
  CustomerAddressPageParams,
  ListByPage,
  CustomerAddressConsumptionDetailDto,
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

  /**
   * 获取客户地址消费详情
   * 统计该地址下所有客户的消费数据总和
   */
  async getConsumptionDetail(
    id: string,
  ): Promise<CustomerAddressConsumptionDetailDto> {
    // 验证地址是否存在
    const address = await this.prisma.customerAddress.findUnique({
      where: { id },
    });

    if (!address) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '客户地址不存在',
      );
    }

    // 查询该地址下所有客户的订单
    const orders = await this.prisma.order.findMany({
      where: {
        customer: {
          customerAddressId: id,
          delete: 0,
        },
        delete: 0,
        status: {
          in: [OrderStatus.PAID, OrderStatus.COMPLETED, OrderStatus.REFUNDED],
        },
      },
      select: {
        quantity: true,
        unitId: true,
        partialRefundAmount: true, // 部分退款金额
        status: true,
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
        addressName: address.name,
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
        // 地址消费额：已退款订单不计入消费额（收入为0）；部分退款按绝对额扣减
        const orderAmount =
          order.status === OrderStatus.REFUNDED
            ? 0
            : originalAmount - partialRefundAmount;
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

    // 地址维度下，isLatestConsumption 固定为 false
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
        return {
          productId,
          productName: name,
          count,
          isLatestConsumption: false, // 地址维度固定为 false
          groupBuys: Object.values(groupBuys).sort((a, b) => {
            // 按照最近参与时间倒序排列（最新的在前）
            const dateA = new Date(a.latestGroupBuyStartDate);
            const dateB = new Date(b.latestGroupBuyStartDate);
            return dateB.getTime() - dateA.getTime();
          }),
        };
      });

    return {
      addressName: address.name,
      orderCount,
      totalAmount,
      averagePricePerOrder,
      totalPartialRefundAmount,
      productConsumptionRanks,
    };
  }
}
