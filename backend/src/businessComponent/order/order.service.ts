import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Order, OrderStatus, Prisma } from '@prisma/client';

import {
  OrderPageParams,
  ListByPage,
  PartialRefundParams,
} from '../../../types/dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async list(data: OrderPageParams): Promise<ListByPage<Order[]>> {
    const { page, pageSize, customerIds, groupBuyIds, statuses } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.OrderWhereInput = {
      delete: 0, // 仅查询未删除的供货商
    };

    if (customerIds && customerIds.length > 0) {
      where.customerId = {
        in: customerIds,
      };
    }

    if (groupBuyIds && groupBuyIds.length > 0) {
      where.groupBuyId = {
        in: groupBuyIds,
      };
    }

    if (statuses && statuses.length > 0) {
      where.status = {
        in: statuses,
      };
    }

    const [orders, totalCount] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 假设您的表中有一个名为 'createdAt' 的字段
        },
        where,
        include: {
          customer: true,
          groupBuy: {
            select: {
              id: true,
              name: true,
              groupBuyStartDate: true,
              units: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }), // 获取总记录数
    ]);

    return {
      data: orders,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string) {
    return this.prisma.order.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        groupBuy: {
          select: {
            id: true,
            name: true,
            groupBuyStartDate: true,
            units: true,
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.order.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }

  async listAll() {
    return this.prisma.order.findMany({
      where: {
        delete: 0, // 仅查询未删除的团购单
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async refund(id: string) {
    return this.prisma.order.update({
      where: {
        id,
      },
      data: {
        status: OrderStatus.REFUNDED,
      },
    });
  }

  /**
   * 处理订单部分退款
   * @param params 部分退款参数
   * @returns 操作结果
   */
  async partialRefund(params: PartialRefundParams) {
    const { orderId, refundAmount } = params;

    // 获取订单信息
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        groupBuy: {
          select: {
            units: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    // 检查订单状态，只有已付款或已完成的订单才能进行部分退款
    if (
      order.status !== OrderStatus.PAID &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new Error('只有已付款或已完成的订单才能进行部分退款');
    }

    // 计算订单总金额
    const units = order.groupBuy.units as Array<{
      id: string;
      unit: string;
      price: number;
      costPrice: number;
    }>;
    const selectedUnit = units.find((unit) => unit.id === order.unitId);

    if (!selectedUnit) {
      throw new Error('找不到对应的商品规格');
    }

    const totalAmount = selectedUnit.price * order.quantity;
    const currentRefundAmount = order.partialRefundAmount || 0;
    const maxRefundAmount = totalAmount - currentRefundAmount;

    // 检查退款金额是否有效
    if (refundAmount <= 0) {
      throw new Error('退款金额必须大于0');
    }

    if (refundAmount > maxRefundAmount) {
      throw new Error(`退款金额不能超过剩余可退款金额 ${maxRefundAmount} 元`);
    }

    // 更新订单的部分退款金额
    const newRefundAmount = currentRefundAmount + refundAmount;

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        partialRefundAmount: newRefundAmount,
        // 如果退款金额等于总金额，则将订单状态改为已退款
        ...(newRefundAmount >= totalAmount && { status: OrderStatus.REFUNDED }),
      },
    });
  }

  /**
   * 获取订单统计数据
   * 返回待付款和已付款订单的数量及详细列表
   */
  async getOrderStats() {
    const where: Prisma.OrderWhereInput = {
      delete: 0,
      status: {
        in: [OrderStatus.NOTPAID, OrderStatus.PAID],
      },
    };

    // 获取待付款和已付款的订单
    const orders = await this.prisma.order.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        groupBuy: {
          select: {
            id: true,
            name: true,
            groupBuyStartDate: true,
          },
        },
      },
    });

    // 分别统计待付款和已付款订单
    const notPaidOrders = orders.filter(
      (order) => order.status === OrderStatus.NOTPAID,
    );
    const paidOrders = orders.filter(
      (order) => order.status === OrderStatus.PAID,
    );

    return {
      notPaidCount: notPaidOrders.length,
      paidCount: paidOrders.length,
      notPaidOrders,
      paidOrders,
    };
  }
}
