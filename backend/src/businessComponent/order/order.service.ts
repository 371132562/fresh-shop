import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Order, OrderStatus, Prisma } from '@prisma/client';

import {
  OrderPageParams,
  ListByPage,
  PartialRefundParams,
  GroupBuyUnit,
  BatchCreateOrdersParams,
  BatchCreateOrdersResult,
  BatchOrderItem,
} from '../../../types/dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.OrderCreateInput): Promise<Order> {
    return this.prisma.order.create({ data });
  }

  async batchCreate(
    data: BatchCreateOrdersParams,
  ): Promise<BatchCreateOrdersResult> {
    const { orders } = data;
    const successOrders: Order[] = [];
    const failedOrders: { order: BatchOrderItem; error: string }[] = [];

    // 使用事务处理批量创建
    for (const orderData of orders) {
      try {
        // 验证必要字段
        if (
          !orderData.groupBuyId ||
          !orderData.unitId ||
          !orderData.customerId ||
          !orderData.quantity
        ) {
          throw new Error(
            '缺少必要字段：groupBuyId, unitId, customerId, quantity',
          );
        }

        // 验证数量必须大于0
        if (orderData.quantity <= 0) {
          throw new Error('购买数量必须大于0');
        }

        // 验证团购是否存在
        const groupBuy = await this.prisma.groupBuy.findFirst({
          where: { id: orderData.groupBuyId, delete: 0 },
        });
        if (!groupBuy) {
          throw new Error('团购不存在');
        }

        // 验证客户是否存在
        const customer = await this.prisma.customer.findFirst({
          where: { id: orderData.customerId, delete: 0 },
        });
        if (!customer) {
          throw new Error('客户不存在');
        }

        // 验证规格是否存在
        const units = groupBuy.units as GroupBuyUnit[];
        const unit = units.find((u) => u.id === orderData.unitId);
        if (!unit) {
          throw new Error('规格不存在');
        }

        // 创建订单
        const order = await this.prisma.order.create({
          data: {
            groupBuyId: orderData.groupBuyId,
            unitId: orderData.unitId,
            customerId: orderData.customerId,
            quantity: orderData.quantity,
            description: orderData.description || null,
            // status 和 partialRefundAmount 由数据库默认值自动设置
          },
        });

        successOrders.push(order);
      } catch (error) {
        failedOrders.push({
          order: orderData,
          error: error instanceof Error ? error.message : '未知错误',
        });
      }
    }

    return {
      successCount: successOrders.length,
      failCount: failedOrders.length,
      successOrders,
      failedOrders,
    };
  }

  async update(id: string, data: Prisma.OrderUpdateInput): Promise<Order> {
    return this.prisma.order.update({
      where: { id },
      data,
    });
  }

  async list(data: OrderPageParams): Promise<ListByPage<Order[]>> {
    const {
      page,
      pageSize,
      customerIds,
      groupBuyIds,
      statuses,
      hasPartialRefund,
    } = data;
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

    // 订单状态与“部分退款”伪状态的组合筛选
    // 需求：当同时选择部分退款与若干真实状态时，返回并集（OR）：满足任一条件即返回
    // 情况1：同时有 statuses 与 hasPartialRefund => 使用 OR
    // 情况2：只有 statuses => 按状态过滤
    // 情况3：只有 hasPartialRefund => 仅筛选部分退款（非已退款且部分退款金额>0）
    if (hasPartialRefund && statuses && statuses.length > 0) {
      const partialRefundCondition: Prisma.OrderWhereInput = {
        AND: [
          { partialRefundAmount: { gt: 0 } },
          { status: { not: OrderStatus.REFUNDED } },
        ],
      };
      const statusCondition: Prisma.OrderWhereInput = {
        status: { in: statuses },
      };
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        { OR: [statusCondition, partialRefundCondition] },
      ];
    } else if (statuses && statuses.length > 0) {
      where.status = { in: statuses };
    } else if (hasPartialRefund) {
      const existingAnd = Array.isArray(where.AND)
        ? where.AND
        : where.AND
          ? [where.AND]
          : [];
      where.AND = [
        ...existingAnd,
        { partialRefundAmount: { gt: 0 } },
        { status: { not: OrderStatus.REFUNDED } },
      ];
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
    const units = order.groupBuy.units as Array<GroupBuyUnit>;
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
            units: true,
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
