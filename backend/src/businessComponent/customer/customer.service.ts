import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Customer, Prisma, OrderStatus } from '@prisma/client';

import {
  CustomerPageParams,
  ListByPage,
  GroupBuyUnit,
  CustomerConsumptionDetailDto,
  CustomerAddressConsumptionDetailDto,
  CustomerOverviewParams,
  CustomerOverviewResult,
  CustomerOverviewListItem,
  MergedGroupBuyFrequencyCustomersParams,
  MergedGroupBuyFrequencyCustomersResult,
  MergedGroupBuyRegionalCustomersParams,
  MergedGroupBuyRegionalCustomersResult,
  CustomerBasicInfo,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  // 解析团购规格列表，保证返回为数组
  private parseUnits(units: unknown): GroupBuyUnit[] {
    return Array.isArray(units) ? (units as GroupBuyUnit[]) : [];
  }

  /**
   * 获取消费详情（统一方法）
   * 支持客户维度和地址维度的消费详情查询
   * @param id 客户ID或地址ID
   * @param type 查询类型：'customer' | 'address'
   */
  async getConsumptionDetail(
    id: string,
    type: 'customer' | 'address' = 'customer',
    startDate?: Date,
    endDate?: Date,
  ): Promise<
    CustomerConsumptionDetailDto | CustomerAddressConsumptionDetailDto
  > {
    // 强类型定义：用于限定 select 返回的订单结构，避免 any 访问
    type SelectedOrder = {
      quantity: number;
      unitId: string;
      partialRefundAmount: number | null;
      status: OrderStatus;
      groupBuy: {
        productId: string;
        name: string;
        groupBuyStartDate: Date;
        createdAt: Date;
        // Prisma JsonValue，这里用 unknown 承接，使用时再断言为 GroupBuyUnit[]
        units?: unknown;
        product: {
          name: string;
        };
      };
      customer?: {
        id: string;
        name: string;
      };
    };
    // 根据类型验证资源是否存在并获取基本信息
    let resourceName: string;
    let resourceAddressName: string | undefined;
    let orders: SelectedOrder[];
    // 用于15天窗口对比的全量订单（不受 startDate/endDate 限制）
    let ordersAllFor15d: SelectedOrder[];

    if (type === 'customer') {
      // 客户维度查询
      const customer = await this.prisma.customer.findUnique({
        where: { id },
        include: {
          customerAddress: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!customer) {
        throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '客户不存在');
      }

      resourceName = customer.name;
      resourceAddressName = customer.customerAddress?.name;

      // 查询该客户的订单（受时间过滤）
      orders = (await this.prisma.order.findMany({
        where: {
          customerId: id,
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
        },
        select: {
          quantity: true,
          unitId: true,
          partialRefundAmount: true,
          status: true,
          groupBuy: {
            include: {
              product: true,
            },
          },
          customer: {
            select: { id: true, name: true },
          },
        },
      })) as SelectedOrder[];

      // 查询该客户的全量订单（用于15天窗口对比，不受时间过滤）
      ordersAllFor15d = (await this.prisma.order.findMany({
        where: {
          customerId: id,
          delete: 0,
          status: {
            in: [OrderStatus.PAID, OrderStatus.COMPLETED, OrderStatus.REFUNDED],
          },
        },
        select: {
          quantity: true,
          unitId: true,
          partialRefundAmount: true,
          status: true,
          groupBuy: {
            include: {
              product: true,
            },
          },
          customer: {
            select: { id: true, name: true },
          },
        },
      })) as SelectedOrder[];
    } else {
      // 地址维度查询
      const address = await this.prisma.customerAddress.findUnique({
        where: { id },
      });

      if (!address) {
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          '客户地址不存在',
        );
      }

      resourceName = address.name;

      // 查询该地址下所有客户的订单（受时间过滤）
      orders = (await this.prisma.order.findMany({
        where: {
          customer: {
            customerAddressId: id,
            delete: 0,
          },
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
        },
        select: {
          quantity: true,
          unitId: true,
          partialRefundAmount: true,
          status: true,
          groupBuy: {
            include: {
              product: true,
            },
          },
          customer: {
            select: { id: true, name: true },
          },
        },
      })) as SelectedOrder[];

      // 查询该地址下所有客户的全量订单（用于15天窗口对比，不受时间过滤）
      ordersAllFor15d = (await this.prisma.order.findMany({
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
          partialRefundAmount: true,
          status: true,
          groupBuy: {
            include: {
              product: true,
            },
          },
          customer: {
            select: { id: true, name: true },
          },
        },
      })) as SelectedOrder[];
    }

    // 订单量仅统计已支付和已完成的订单，不包括已退款订单
    const orderCount = orders.filter(
      (o) =>
        o.status === OrderStatus.PAID || o.status === OrderStatus.COMPLETED,
    ).length;
    if (orderCount === 0) {
      const baseResult = {
        orderCount: 0,
        totalAmount: 0,
        averagePricePerOrder: 0,
        totalRefundAmount: 0,
        totalPartialRefundAmount: 0,
        totalRefundedOrderCount: 0,
        totalPartialRefundOrderCount: 0,
        productConsumptionRanks: [],
      };

      if (type === 'customer') {
        return {
          customerName: resourceName,
          customerAddressName: resourceAddressName,
          ...baseResult,
        } as CustomerConsumptionDetailDto;
      } else {
        return {
          addressName: resourceName,
          ...baseResult,
        } as CustomerAddressConsumptionDetailDto;
      }
    }

    // 统计消费数据
    let totalAmount = 0;
    let totalRefundAmount = 0;
    let totalPartialRefundAmount = 0;
    let totalRefundedOrderCount = 0;
    let totalPartialRefundOrderCount = 0;
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
            totalRefundAmount: number;
            totalPartialRefundAmount: number;
            latestGroupBuyStartDate: Date;
          }
        >;
      }
    > = {};

    for (const order of orders) {
      const units = this.parseUnits(order.groupBuy.units);
      const unit = units.find((u) => u.id === order.unitId);
      if (unit) {
        const originalAmount = unit.price * order.quantity;
        const partialRefundAmount = order.partialRefundAmount || 0;

        // 消费额计算：已退款订单不计入消费额（收入为0）；部分退款按绝对额扣减
        const orderAmount =
          order.status === OrderStatus.REFUNDED
            ? 0
            : originalAmount - partialRefundAmount;
        totalAmount += orderAmount;

        // 统计退款相关数据
        if (order.status === OrderStatus.REFUNDED) {
          totalRefundAmount += originalAmount;
          totalRefundedOrderCount += 1;
        } else {
          totalRefundAmount += partialRefundAmount;
          if (partialRefundAmount > 0) {
            totalPartialRefundOrderCount += 1;
          }
        }
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

        // 只有非退款订单才计入购买次数
        if (order.status !== OrderStatus.REFUNDED) {
          productCounts[order.groupBuy.productId].count++;
        }

        // 在商品下统计团购数据
        if (!productCounts[order.groupBuy.productId].groupBuys[groupBuyKey]) {
          productCounts[order.groupBuy.productId].groupBuys[groupBuyKey] = {
            groupBuyName: order.groupBuy.name,
            unitName: unit.unit,
            count: 0,
            totalAmount: 0,
            totalRefundAmount: 0,
            totalPartialRefundAmount: 0,
            latestGroupBuyStartDate: order.groupBuy.groupBuyStartDate,
          };
        } else {
          // 更新最近一次团购发起时间（取最新的时间）
          const currentStartDate = new Date(order.groupBuy.groupBuyStartDate);
          const existingStartDate = new Date(
            productCounts[order.groupBuy.productId].groupBuys[groupBuyKey]
              .latestGroupBuyStartDate,
          );
          if (currentStartDate > existingStartDate) {
            productCounts[order.groupBuy.productId].groupBuys[
              groupBuyKey
            ].latestGroupBuyStartDate = order.groupBuy.groupBuyStartDate;
          }
        }

        // 只有非退款订单才计入团购购买次数和小计金额
        if (order.status !== OrderStatus.REFUNDED) {
          const groupBuy =
            productCounts[order.groupBuy.productId].groupBuys[groupBuyKey];
          groupBuy.count++;
          groupBuy.totalAmount += orderAmount;
        }

        // 统计团购级别的退款数据
        if (order.status === OrderStatus.REFUNDED) {
          productCounts[order.groupBuy.productId].groupBuys[
            groupBuyKey
          ].totalRefundAmount += originalAmount;
        } else {
          productCounts[order.groupBuy.productId].groupBuys[
            groupBuyKey
          ].totalRefundAmount += partialRefundAmount;
        }
        productCounts[order.groupBuy.productId].groupBuys[
          groupBuyKey
        ].totalPartialRefundAmount += partialRefundAmount;
      }
    }

    const averagePricePerOrder = totalAmount / orderCount;

    // ================================================================
    // 最近15天 vs 再往前15天 对比统计（总体与商品维度）
    // 口径：
    // - 时间：按 groupBuyStartDate 归属至对应窗口
    // - 订单：仅统计状态 ∈ [PAID, COMPLETED]
    // - 金额：退款订单金额记为0；部分退款按绝对额扣减
    // ================================================================
    const now = new Date();
    const endCurrent = new Date(now);
    const startCurrent = new Date(endCurrent);
    startCurrent.setDate(startCurrent.getDate() - 14); // 包含今天在内15天窗口
    const endPrevious = new Date(startCurrent);
    const startPrevious = new Date(endPrevious);
    startPrevious.setDate(startPrevious.getDate() - 15);

    const sumWindow = (list: typeof orders, start: Date, end: Date) => {
      let amount = 0;
      let count = 0;
      for (const o of list) {
        const d = o.groupBuy.groupBuyStartDate;
        if (d >= start && d <= end) {
          const units = this.parseUnits(o.groupBuy.units);
          const unit = units.find((u) => u.id === o.unitId);
          if (!unit) continue;
          const originalAmount = unit.price * o.quantity;
          const partial = o.partialRefundAmount || 0;
          const orderAmount =
            o.status === OrderStatus.REFUNDED ? 0 : originalAmount - partial;
          amount += orderAmount;
          // 订单量仅统计已支付/已完成
          if (
            o.status === OrderStatus.PAID ||
            o.status === OrderStatus.COMPLETED
          ) {
            count += 1;
          }
        }
      }
      return { totalAmount: amount, orderCount: count };
    };

    // 15天窗口对比应基于“全量订单”，不受外部时间参数影响
    const currentOverall = sumWindow(ordersAllFor15d, startCurrent, endCurrent);
    const previousOverall = sumWindow(
      ordersAllFor15d,
      startPrevious,
      endPrevious,
    );

    // 商品维度
    const groupByProduct = (list: typeof orders, start: Date, end: Date) => {
      const map = new Map<
        string,
        { productName: string; totalAmount: number; orderCount: number }
      >();
      for (const o of list) {
        const d = o.groupBuy.groupBuyStartDate;
        if (d >= start && d <= end) {
          const units = this.parseUnits(o.groupBuy.units);
          const unit = units.find((u) => u.id === o.unitId);
          if (!unit) continue;
          const originalAmount = unit.price * o.quantity;
          const partial = o.partialRefundAmount || 0;
          const orderAmount =
            o.status === OrderStatus.REFUNDED ? 0 : originalAmount - partial;
          const key = o.groupBuy.productId;
          if (!map.has(key)) {
            map.set(key, {
              productName: o.groupBuy.product.name,
              totalAmount: 0,
              orderCount: 0,
            });
          }
          const agg = map.get(key)!;
          agg.totalAmount += orderAmount;
          // 订单量仅统计已支付/已完成
          if (
            o.status === OrderStatus.PAID ||
            o.status === OrderStatus.COMPLETED
          ) {
            agg.orderCount += 1;
          }
        }
      }
      return map;
    };

    const currentByProduct = groupByProduct(
      ordersAllFor15d,
      startCurrent,
      endCurrent,
    );
    const previousByProduct = groupByProduct(
      ordersAllFor15d,
      startPrevious,
      endPrevious,
    );

    const fifteenDayProductComparisons = Array.from(
      new Set<string>([
        ...Array.from(currentByProduct.keys()),
        ...Array.from(previousByProduct.keys()),
      ]),
    )
      .map((productId) => {
        const curr = currentByProduct.get(productId) || {
          productName: '',
          totalAmount: 0,
          orderCount: 0,
        };
        const prev = previousByProduct.get(productId) || {
          productName: curr.productName,
          totalAmount: 0,
          orderCount: 0,
        };
        return {
          productId,
          productName: curr.productName || prev.productName,
          current: {
            totalAmount: curr.totalAmount,
            orderCount: curr.orderCount,
          },
          previous: {
            totalAmount: prev.totalAmount,
            orderCount: prev.orderCount,
          },
          diff: {
            totalAmount: curr.totalAmount - prev.totalAmount,
            orderCount: curr.orderCount - prev.orderCount,
          },
        };
      })
      .sort((a, b) => b.current.totalAmount - a.current.totalAmount);

    // 处理isLatestConsumption逻辑（仅客户维度需要）
    let globalLatestDate: Date | null = null;
    let globalLatestCreatedAt: Date | null = null;

    if (type === 'customer') {
      // 找到全局最新的团购发起时间（用于标识最新消费）
      for (const order of orders) {
        const latestGroupBuyStartDate = order.groupBuy.groupBuyStartDate;
        if (!globalLatestDate || latestGroupBuyStartDate > globalLatestDate) {
          globalLatestDate = latestGroupBuyStartDate;
        }
      }

      // 当存在多个同一天的团购时，再细分比较创建时间，找出该天中最新创建的时间
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
    }

    // 生成商品消费排行
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
        let isLatestConsumption = false;

        if (type === 'customer') {
          // 客户维度：计算isLatestConsumption
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
          isLatestConsumption =
            !!productLatestDate &&
            !!globalLatestDate &&
            productLatestDate.getTime() === globalLatestDate.getTime();

          // 当发起时间相同可能存在多个"最新"，此时使用创建时间做二次细分
          if (
            isLatestConsumption &&
            globalLatestCreatedAt &&
            productLatestDate
          ) {
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
        } else {
          // 地址维度：isLatestConsumption固定为false
          isLatestConsumption = false;
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

    // 根据类型返回对应的结果
    type AddressCustomerStat = NonNullable<
      CustomerAddressConsumptionDetailDto['addressCustomerStats']
    >[number];

    type CommonConsumptionBase = Omit<
      CustomerConsumptionDetailDto,
      'customerName'
    > & {
      addressCustomerStats?: AddressCustomerStat[];
    };

    const baseResult: CommonConsumptionBase = {
      orderCount,
      totalAmount,
      averagePricePerOrder,
      totalRefundAmount,
      totalPartialRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      productConsumptionRanks,
      fifteenDayComparison: {
        current: currentOverall,
        previous: previousOverall,
        diff: {
          totalAmount: currentOverall.totalAmount - previousOverall.totalAmount,
          orderCount: currentOverall.orderCount - previousOverall.orderCount,
        },
      },
      fifteenDayProductComparisons,
    };

    // 地址维度：统计地址下客户聚合
    if (type === 'address') {
      const byCustomer: Record<
        string,
        {
          name: string;
          orderCount: number;
          totalAmount: number;
          totalRefundAmount: number;
          totalPartialRefundAmount: number;
          partialRefundOrderCount: number;
          refundedOrderCount: number;
        }
      > = {};

      for (const order of orders) {
        const customerId = order.customer?.id;
        const customerName = order.customer?.name || '';
        if (!customerId) continue;
        if (!byCustomer[customerId]) {
          byCustomer[customerId] = {
            name: customerName,
            orderCount: 0,
            totalAmount: 0,
            totalRefundAmount: 0,
            totalPartialRefundAmount: 0,
            partialRefundOrderCount: 0,
            refundedOrderCount: 0,
          };
        }

        const units = this.parseUnits(order.groupBuy.units);
        const unit = units.find((u) => u.id === order.unitId);
        if (!unit) continue;
        const originalAmount = unit.price * order.quantity;
        const partial = order.partialRefundAmount || 0;

        // 已支付/已完成订单：计入订单量和销售额
        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.COMPLETED
        ) {
          byCustomer[customerId].orderCount += 1;
          const orderAmount = originalAmount - partial;
          byCustomer[customerId].totalAmount += orderAmount;
          byCustomer[customerId].totalRefundAmount += partial; // 部分退款
          if (partial > 0) {
            byCustomer[customerId].partialRefundOrderCount += 1;
          }
        }
        // 已退款订单：不计入订单量，销售额为0，但计入退款金额
        else if (order.status === OrderStatus.REFUNDED) {
          byCustomer[customerId].totalRefundAmount += originalAmount;
          byCustomer[customerId].refundedOrderCount += 1;
        }

        byCustomer[customerId].totalPartialRefundAmount += partial;
      }

      baseResult.addressCustomerStats = Object.entries(byCustomer)
        .map(([customerId, v]) => ({
          customerId,
          customerName: v.name,
          orderCount: v.orderCount,
          totalAmount: v.totalAmount,
          totalRefundAmount: v.totalRefundAmount,
          totalPartialRefundAmount: v.totalPartialRefundAmount,
          partialRefundOrderCount: v.partialRefundOrderCount,
          refundedOrderCount: v.refundedOrderCount,
        }))
        .sort((a, b) => b.totalAmount - a.totalAmount);
    }

    if (type === 'customer') {
      return {
        customerName: resourceName,
        customerAddressName: resourceAddressName,
        ...baseResult,
      } as CustomerConsumptionDetailDto;
    } else {
      return {
        addressName: resourceName,
        ...baseResult,
      } as CustomerAddressConsumptionDetailDto;
    }
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

          // 计算总金额（扣除部分退款；已退款订单不计入消费额）
          let totalAmount = 0;
          orders.forEach((order) => {
            const units = this.parseUnits(order.groupBuy.units);
            const unit = units.find((u) => u.id === order.unitId);
            if (unit) {
              const originalAmount = unit.price * order.quantity;
              const partial = order.partialRefundAmount || 0;
              totalAmount +=
                order.status === OrderStatus.REFUNDED
                  ? 0
                  : originalAmount - partial;
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

      // 统计无订单客户数量（订单量为0的客户）
      const noOrderCount = customersWithTotalAmount.filter(
        (c) => c.orderCount === 0,
      ).length;

      return {
        data: paginatedCustomers,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
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

          let totalAmount = 0;
          orders.forEach((order) => {
            const units = this.parseUnits(order.groupBuy.units);
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
            ...customer,
            customerAddressName: customer.customerAddress?.name,
            customerAddress: undefined,
            orderCount: customer._count.orders,
            orderTotalAmount: totalAmount,
          };
        }),
      );

      // 统计无订单客户数量（符合当前筛选条件且订单量为0的客户）
      const noOrderCount = await this.prisma.customer.count({
        where: {
          ...where,
          orders: {
            none: {
              delete: 0,
              status: {
                in: [OrderStatus.PAID, OrderStatus.COMPLETED],
              },
            },
          },
        },
      });

      return {
        data: customersWithTotalAmount,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
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
        createdAt: 'desc',
      },
    });
  }

  // 客户概况：按客户聚合订单金额与数量，并支持时间范围/搜索/排序/分页
  async getCustomerOverview(
    params: CustomerOverviewParams,
  ): Promise<CustomerOverviewResult> {
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      customerName = '',
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
      customer: customerName
        ? {
            name: { contains: customerName },
            delete: 0,
          }
        : { delete: 0 },
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
        customerId: true,
        customer: { select: { name: true } },
        groupBuy: { select: { units: true } },
      },
    });

    type Agg = {
      customerId: string;
      customerName: string;
      totalRevenue: number;
      totalOrderCount: number;
      totalRefundAmount: number;
    };
    const aggMap = new Map<string, Agg>();

    for (const o of orders) {
      const units = (o.groupBuy.units as unknown as Array<GroupBuyUnit>) || [];
      const unit = units.find((u) => u.id === o.unitId);
      if (!unit) continue;
      const originalRevenue = unit.price * o.quantity;
      const partial = o.partialRefundAmount || 0;

      if (!aggMap.has(o.customerId)) {
        aggMap.set(o.customerId, {
          customerId: o.customerId,
          customerName: o.customer?.name || '未知客户',
          totalRevenue: 0,
          totalOrderCount: 0,
          totalRefundAmount: 0,
        });
      }
      const agg = aggMap.get(o.customerId)!;

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

    let list: CustomerOverviewListItem[] = Array.from(aggMap.values()).map(
      (x) => ({
        customerId: x.customerId,
        customerName: x.customerName,
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

  /**
   * 获取特定购买频次的客户列表（团购合并维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 频次：支持精确频次 frequency，或范围 [minFrequency, maxFrequency]。
   * 输出：符合频次条件的客户基本信息及其购买次数（purchaseCount）。
   */
  async getMergedGroupBuyFrequencyCustomers(
    params: MergedGroupBuyFrequencyCustomersParams,
  ): Promise<MergedGroupBuyFrequencyCustomersResult> {
    // ================================================================
    // 步骤一：构建查询条件并拉取订单
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：按 groupBuyStartDate 过滤
    // - 字段：仅保留客户基本信息，用于统计与返回
    // ================================================================
    const {
      groupBuyName,
      supplierId,
      frequency,
      minFrequency,
      maxFrequency,
      startDate,
      endDate,
    } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
      supplierId: supplierId,
      delete: 0,
      // 如果提供了时间参数，则添加时间过滤条件
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2) 查询指定名称的团购单及其订单数据
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: whereCondition,
      orderBy: {
        groupBuyStartDate: 'desc',
      },
      include: {
        order: {
          where: {
            delete: 0,
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
                customerAddress: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 3) 统计每个客户的购买次数
    const customerPurchaseCounts = new Map<
      string,
      {
        customer: CustomerBasicInfo;
        count: number;
      }
    >();

    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerId = order.customer.id;
        const customerInfo = {
          customerId: order.customer.id,
          customerName: order.customer.name,
          customerAddressName: order.customer.customerAddress?.name,
        };

        if (customerPurchaseCounts.has(customerId)) {
          const existing = customerPurchaseCounts.get(customerId)!;
          existing.count += 1;
        } else {
          customerPurchaseCounts.set(customerId, {
            customer: customerInfo,
            count: 1,
          });
        }
      }
    }

    // 4) 应用频次过滤（单值或范围）
    const minF = minFrequency ?? frequency ?? 0;
    const maxF = maxFrequency ?? frequency ?? Number.POSITIVE_INFINITY;

    const filteredCustomers = Array.from(customerPurchaseCounts.values())
      .filter((item) => item.count >= minF && item.count <= maxF)
      .map((item) => ({ ...item.customer, purchaseCount: item.count }));

    return {
      groupBuyName,
      // 保留 frequency 字段用于兼容（取 frequency 或 minF）
      frequency: frequency ?? minF,
      customers: filteredCustomers,
    };
  }

  /**
   * 获取特定区域的客户列表（团购合并维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 区域：根据客户地址 addressId 进行筛选，客户去重返回。
   * 输出：指定区域下的客户基本信息列表，并附带地址名称。
   */
  async getMergedGroupBuyRegionalCustomers(
    params: MergedGroupBuyRegionalCustomersParams,
  ): Promise<MergedGroupBuyRegionalCustomersResult> {
    // ================================================================
    // 步骤一：构建查询条件与数据拉取
    // - 仅取 delete=0 且状态为已支付/已完成的订单
    // - 时间通过 groupBuyStartDate 过滤
    // - 选择客户与地址字段用于筛选与返回
    // ================================================================
    const { groupBuyName, supplierId, addressId, startDate, endDate } = params;

    // 1. 构建查询条件
    const whereCondition = {
      name: groupBuyName,
      supplierId: supplierId,
      delete: 0,
      // 如果提供了时间参数，则添加时间过滤条件
      ...(startDate &&
        endDate && {
          groupBuyStartDate: {
            gte: startDate,
            lte: endDate,
          },
        }),
    };

    // 2) 查询指定名称的团购单及其订单数据
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: whereCondition,
      orderBy: {
        groupBuyStartDate: 'desc',
      },
      include: {
        order: {
          where: {
            delete: 0,
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
          },
          include: {
            customer: {
              include: {
                customerAddress: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 3) 筛选指定区域的客户并去重
    const regionalCustomers = new Map<string, CustomerBasicInfo>();

    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerAddress = order.customer.customerAddress;
        if (customerAddress && customerAddress.id === addressId) {
          const customerId = order.customer.id;
          if (!regionalCustomers.has(customerId)) {
            regionalCustomers.set(customerId, {
              customerId: order.customer.id,
              customerName: order.customer.name,
            });
          }
        }
      }
    }

    // 4) 获取地址名称（从符合条件的订单中提取一次）
    let addressName = '';
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerAddress = order.customer.customerAddress;
        if (customerAddress && customerAddress.id === addressId) {
          addressName = customerAddress.name;
          break;
        }
      }
      if (addressName) break;
    }

    return {
      groupBuyName,
      addressId,
      addressName,
      customers: Array.from(regionalCustomers.values()),
    };
  }
}
