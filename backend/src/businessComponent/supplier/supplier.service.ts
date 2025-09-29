import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Prisma, Supplier, OrderStatus } from '@prisma/client';

import {
  SupplierPageParams,
  ListByPage,
  SupplierListItem,
  SupplierOverviewParams,
  SupplierOverviewResult,
  SupplierOverviewListItem,
  SupplierOverviewDetailParams,
  SupplierOverviewDetail,
  ProductStatItem,
  ProductCategoryStat,
  SupplierFrequencyCustomersParams,
  SupplierFrequencyCustomersResult,
  SupplierRegionalCustomersParams,
  SupplierRegionalCustomersResult,
  CustomerBasicInfo,
  CustomerPurchaseFrequency,
  RegionalSalesItem,
  GroupBuyLaunchHistory,
  GroupBuyUnit,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { UploadService } from '../../upload/upload.service';

@Injectable()
export class SupplierService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  async create(data: Prisma.SupplierCreateInput): Promise<Supplier> {
    const { name, phone, wechat } = data;
    const existingSupplier = await this.prisma.supplier.findFirst({
      where: {
        delete: 0,
        OR: [{ name: name }, { phone: phone }, { wechat: wechat }],
      },
    });

    if (existingSupplier) {
      if (existingSupplier.name === name) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '供货商名称已存在');
      }
      if (existingSupplier.phone === phone) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '供货商电话已存在');
      }
      if (existingSupplier.wechat === wechat) {
        throw new BusinessException(ErrorCode.DATA_EXIST, '供货商微信已存在');
      }
    }
    return this.prisma.supplier.create({ data });
  }

  async update(
    id: string,
    data: Prisma.SupplierUpdateInput,
  ): Promise<Supplier> {
    return this.prisma.supplier.update({
      where: { id },
      data,
    });
  }

  async list(
    data: SupplierPageParams,
  ): Promise<ListByPage<SupplierListItem[]>> {
    const { page, pageSize, name, phone, wechat, sortField, sortOrder } = data;
    const skip = (page - 1) * pageSize; // 计算要跳过的记录数

    const where: Prisma.SupplierWhereInput = {
      delete: 0, // 仅查询未删除的供货商
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

    const [suppliers, totalCount] = await this.prisma.$transaction([
      this.prisma.supplier.findMany({
        skip: skip,
        take: pageSize,
        orderBy: {
          createdAt: 'desc', // 默认按创建时间降序
        },
        where,
        include: {
          _count: {
            select: {
              groupBuy: {
                where: {
                  delete: 0,
                },
              },
            },
          },
          groupBuy: {
            where: { delete: 0 },
            select: {
              id: true,
              units: true,
              order: {
                where: {
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
                  status: true,
                  partialRefundAmount: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }), // 获取总记录数
    ]);

    // 计算每个供货商的订单量与订单总额
    const items: SupplierListItem[] = suppliers.map((supplier) => {
      let orderCount = 0;
      let orderTotalAmount = 0;
      const groupBuyCount = supplier._count.groupBuy;
      for (const gb of supplier.groupBuy as Array<{
        id: string;
        units: any;
        order: Array<{
          quantity: number;
          unitId: string;
          status: OrderStatus;
          partialRefundAmount: number | null;
        }>;
      }>) {
        const units = gb.units as Array<{
          id: string;
          price: number;
          costPrice?: number;
        }>;
        for (const order of gb.order) {
          const unit = units.find((u) => u.id === order.unitId);
          if (!unit) continue;
          const gross = unit.price * order.quantity;
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            orderCount += 1;
            orderTotalAmount += Math.max(
              0,
              gross - (order.partialRefundAmount || 0),
            );
          }
          // REFUNDED 订单总额按0计入
        }
      }
      return {
        ...supplier,
        orderCount,
        orderTotalAmount,
        groupBuyCount,
      } as unknown as SupplierListItem;
    });

    // 按需排序（后端排序，字段来自前端可选项）
    if (sortField) {
      const order = sortOrder === 'asc' ? 1 : -1;
      items.sort((a, b) => {
        const pick = (x: SupplierListItem) => {
          switch (sortField) {
            case 'orderCount':
              return x.orderCount;
            case 'orderTotalAmount':
              return x.orderTotalAmount;
            case 'groupBuyCount':
              return x.groupBuyCount;
            case 'createdAt':
              return x.createdAt ? new Date(x.createdAt).getTime() : 0;
            default:
              return 0;
          }
        };
        return (pick(a) - pick(b)) * order;
      });
    }

    return {
      data: items,
      page: page,
      pageSize: pageSize,
      totalCount: totalCount,
      totalPages: Math.ceil(totalCount / pageSize), // 计算总页数
    };
  }

  async detail(id: string): Promise<Supplier | null> {
    return this.prisma.supplier.findUnique({
      where: { id },
    });
  }

  async delete(id: string): Promise<Supplier> {
    const existingSupplier = await this.prisma.supplier.findUnique({
      where: { id, delete: 0 },
    });

    if (!existingSupplier) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '供货商不存在或已被删除。',
      );
    }

    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        supplierId: id,
        delete: 0, // 只检查未删除的团购单
      },
    });

    if (groupBuyCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该供货商下存在关联的团购单（${groupBuyCount}条），无法删除。`,
      );
    }

    const deletedSupplier = await this.prisma.supplier.update({
      where: { id },
      data: { delete: 1 },
    });

    // 软删除成功后，清理关联的图片
    if (existingSupplier.images && Array.isArray(existingSupplier.images)) {
      for (const filename of existingSupplier.images as string[]) {
        await this.uploadService.cleanupOrphanedImage(filename);
      }
    }

    return deletedSupplier;
  }

  async listAll(): Promise<Supplier[]> {
    return this.prisma.supplier.findMany({
      where: {
        delete: 0,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * 获取供货商概况数据
   * 按供货商维度统计销售、订单、客户等数据，用于供货商概况列表展示
   *
   * @param params 查询参数，包含时间范围、分页、搜索、排序等条件
   * @returns 供货商概况分页结果，包含供货商列表和分页信息
   *
   * 统计维度：
   * - 总销售额：供货商所有团购单的销售总额
   * - 总利润：供货商所有团购单的利润总额
   * - 总订单量：供货商所有团购单的订单总数
   * - 参与客户数：去重后的客户数量
   * - 团购单数：供货商发起的团购单总数
   * - 平均利润率：总利润/总销售额的百分比
   * - 活跃天数：有订单的天数
   * - 最近订单日期：最后一次订单的时间
   */
  async getSupplierOverview(
    params: SupplierOverviewParams,
  ): Promise<SupplierOverviewResult> {
    // ================================================================
    // 接口：供货商概况列表（按供货商维度）
    // 目标：聚合供货商在指定时间范围内的核心指标并分页返回
    // 过滤：供货商 delete=0；团购 delete=0；按 groupBuyStartDate 进行时间过滤
    // 订单口径：delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]
    // 指标口径：
    //   - 总销售额 totalRevenue：退款订单记 0；部分退款直减
    //   - 总利润 totalProfit：退款订单记 -成本；部分退款直减
    //   - 总订单量 totalOrderCount：仅计 PAID/COMPLETED
    //   - 参与客户数 uniqueCustomerCount：去重客户ID
    //   - 团购单数 totalGroupBuyCount：该供货商匹配的团购数量
    //   - 平均利润率 averageProfitMargin：totalProfit/totalRevenue*100（分母为0时为0）
    // ================================================================
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      supplierName,
      sortField = 'totalRevenue',
      sortOrder = 'desc',
    } = params;

    // 1) 构建供货商查询条件（基础 + 名称模糊）
    const whereCondition = {
      delete: 0, // 只查询未删除的供货商
      ...(supplierName && {
        name: {
          contains: supplierName, // 按供货商名称模糊匹配
        },
      }),
    };

    // 2) 获取供货商及其团购/订单数据（避免 N+1）
    // - 包含关系：供货商 -> 团购单 -> 订单
    // - 时间过滤：groupBuyStartDate（若提供）
    const suppliersWithData = await this.prisma.supplier.findMany({
      where: whereCondition,
      include: {
        groupBuy: {
          where: {
            delete: 0, // 只查询未删除的团购单
            // 时间过滤：如果提供了时间参数，则只查询指定时间范围内的团购单
            ...(startDate &&
              endDate && {
                groupBuyStartDate: {
                  gte: startDate, // 团购发起时间 >= 开始时间
                  lte: endDate, // 团购发起时间 <= 结束时间
                },
              }),
          },
          include: {
            order: {
              where: {
                delete: 0, // 只查询未删除的订单
                status: {
                  in: [
                    OrderStatus.PAID,
                    OrderStatus.COMPLETED,
                    OrderStatus.REFUNDED,
                  ],
                },
              },
              select: {
                quantity: true, // 购买数量
                unitId: true, // 规格ID
                customerId: true, // 客户ID
                createdAt: true, // 订单创建时间
                partialRefundAmount: true, // 部分退款金额
                status: true,
              },
            },
          },
        },
      },
    });

    // 3) 计算每个供货商的统计数据
    // - 遍历团购与订单，按金额与口径累计
    // - 退款：收入=0，利润=-成本；部分退款：直减
    // - 订单量：仅计已支付/已完成
    const supplierStats: SupplierOverviewListItem[] = [];

    for (const supplier of suppliersWithData) {
      // 初始化统计容器
      const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息，用于计算价格和利润
      const uniqueCustomerIds = new Set<string>(); // 去重客户ID，用于统计参与客户数
      let totalRevenue = 0; // 总销售额
      let totalProfit = 0; // 总利润
      let totalOrderCount = 0; // 总订单量
      let totalRefundAmount = 0; // 总退款金额（部分退款+全额退款）

      // 遍历该供货商的所有团购单
      for (const groupBuy of supplier.groupBuy) {
        const groupBuyUnits = groupBuy.units as Array<GroupBuyUnit>;

        // 规格信息缓存到 Map（用于后续快速查价/成本）
        for (const unit of groupBuyUnits) {
          units.set(unit.id, unit);
        }

        // 遍历该团购单的所有订单，计算各项统计数据
        for (const order of groupBuy.order) {
          const unit = units.get(order.unitId);
          if (unit) {
            // 金额计算（仅退款不退货规则）
            const originalRevenue = unit.price * order.quantity;
            const originalProfit =
              (unit.price - unit.costPrice) * order.quantity;
            const originalCost = unit.costPrice * order.quantity;

            const partial = order.partialRefundAmount || 0;
            const orderRevenue =
              order.status === OrderStatus.REFUNDED
                ? 0
                : originalRevenue - partial;
            const orderProfit =
              order.status === OrderStatus.REFUNDED
                ? -originalCost
                : originalProfit - partial;

            // 累加到供货商总统计
            totalRevenue += orderRevenue;
            totalProfit += orderProfit;
            // 退款金额累计口径：
            // - 若订单已全额退款（REFUNDED），仅累计全额退款金额（原始收入），不叠加该单的部分退款，避免重复
            // - 否则仅累计部分退款金额
            if (order.status === OrderStatus.REFUNDED) {
              totalRefundAmount += originalRevenue;
            } else if (partial > 0) {
              totalRefundAmount += partial;
            }
            if (
              order.status === OrderStatus.PAID ||
              order.status === OrderStatus.COMPLETED
            ) {
              totalOrderCount++;
              // 仅在有效订单（PAID/COMPLETED）时计入参与客户，保持与详情接口一致
              uniqueCustomerIds.add(order.customerId);
            }
          }
        }
      }

      // 派生指标：平均利润率（总利润/总销售额*100）
      const averageProfitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // 构建供货商统计结果对象
      supplierStats.push({
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalRevenue, // 总销售额
        totalProfit, // 总利润
        totalOrderCount, // 总订单量
        totalRefundAmount, // 总退款金额
        uniqueCustomerCount: uniqueCustomerIds.size, // 参与客户数（去重）
        totalGroupBuyCount: supplier.groupBuy.length, // 团购单数
        averageProfitMargin, // 平均利润率
      });
    }

    // 4) 排序处理（按指定字段与方向）
    supplierStats.sort((a, b) => {
      let aValue: number;
      let bValue: number;

      // 选择比较字段
      switch (sortField) {
        case 'totalRevenue': // 按总销售额排序
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
          break;
        case 'totalProfit': // 按总利润排序
          aValue = a.totalProfit;
          bValue = b.totalProfit;
          break;
        case 'totalOrderCount': // 按总订单量排序
          aValue = a.totalOrderCount;
          bValue = b.totalOrderCount;
          break;
        case 'totalRefundAmount': // 按退款金额排序
          aValue = a.totalRefundAmount;
          bValue = b.totalRefundAmount;
          break;
        case 'uniqueCustomerCount': // 按参与客户数排序
          aValue = a.uniqueCustomerCount;
          bValue = b.uniqueCustomerCount;
          break;
        case 'totalGroupBuyCount': // 按团购单数排序
          aValue = a.totalGroupBuyCount;
          bValue = b.totalGroupBuyCount;
          break;
        case 'averageProfitMargin': // 按平均利润率排序
          aValue = a.averageProfitMargin;
          bValue = b.averageProfitMargin;
          break;
        default: // 默认按总销售额排序
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      // 返回升/降序结果
      return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
    });

    // 5) 分页处理
    const startIndex = (page - 1) * pageSize; // 起始索引
    const endIndex = startIndex + pageSize; // 结束索引
    const paginatedList = supplierStats.slice(startIndex, endIndex); // 截取指定页的数据

    return {
      list: paginatedList,
      total: supplierStats.length,
      page,
      pageSize,
    };
  }

  /**
   * 获取供货商特定购买频次的客户列表（供货商维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计该供货商全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 频次：支持单值 frequency 或范围 [minFrequency, maxFrequency]。
   * 输出：符合频次条件的客户基本信息及其购买次数。
   */
  async getSupplierFrequencyCustomers(
    params: SupplierFrequencyCustomersParams,
  ): Promise<SupplierFrequencyCustomersResult> {
    // ================================================================
    // 1）构建时间过滤并拉取订单
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：按 groupBuyStartDate 过滤
    // - 字段：仅保留客户基本信息
    // ================================================================
    const {
      supplierId,
      frequency,
      minFrequency,
      maxFrequency,
      startDate,
      endDate,
    } = params;

    // 构建时间过滤条件
    const timeFilter =
      startDate && endDate
        ? {
            groupBuyStartDate: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    // 2) 查询指定供货商的团购及其订单
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        supplierId,
        delete: 0,
        ...timeFilter,
      },
      orderBy: {
        groupBuyStartDate: 'desc',
      },
      include: {
        order: {
          where: {
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
            delete: 0,
          },
          select: {
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 3) 统计每个客户的购买次数
    const customerPurchaseCounts = new Map<string, number>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const customerId = order.customerId;
        const currentCount = customerPurchaseCounts.get(customerId) || 0;
        customerPurchaseCounts.set(customerId, currentCount + 1);
      }
    }

    // 4) 应用频次过滤（单值或范围）并返回客户基本信息
    const minF = minFrequency ?? frequency ?? 0;
    const maxF = maxFrequency ?? frequency ?? Number.POSITIVE_INFINITY;

    const targetCustomers: CustomerBasicInfo[] = [];
    for (const [customerId, count] of customerPurchaseCounts.entries()) {
      if (count >= minF && count <= maxF) {
        // 查找客户信息（避免再次查询，直接从已拉取数据中取一次）
        for (const groupBuy of groupBuysWithOrders) {
          for (const order of groupBuy.order) {
            if (order.customerId === customerId) {
              targetCustomers.push({
                customerId: order.customer.id,
                customerName: order.customer.name,
                purchaseCount: count,
              });
              break; // 找到客户信息后跳出内层循环
            }
          }
          if (targetCustomers.some((c) => c.customerId === customerId)) {
            break; // 已添加该客户，跳出外层循环
          }
        }
      }
    }

    return {
      customers: targetCustomers,
    };
  }

  /**
   * 获取供货商特定区域的客户列表（供货商维度）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计该供货商全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED]。
   * - 区域：依据订单关联客户的 addressId 进行过滤，客户去重返回。
   * 输出：指定地址下的去重客户列表。
   */
  async getSupplierRegionalCustomers(
    params: SupplierRegionalCustomersParams,
  ): Promise<SupplierRegionalCustomersResult> {
    // ================================================================
    // 步骤一：构建时间过滤并拉取订单
    // - 过滤：delete=0，状态 ∈ [PAID, COMPLETED]
    // - 时间：按 groupBuyStartDate 过滤
    // - 字段：仅保留客户与地址字段
    // ================================================================
    const { supplierId, addressId, startDate, endDate } = params;

    // 构建时间过滤条件
    const timeFilter =
      startDate && endDate
        ? {
            groupBuyStartDate: {
              gte: startDate,
              lte: endDate,
            },
          }
        : {};

    // 2) 查询指定供货商的团购及其订单
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        supplierId,
        delete: 0,
        ...timeFilter,
      },
      orderBy: {
        groupBuyStartDate: 'desc',
      },
      select: {
        order: {
          where: {
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
            delete: 0,
          },
          select: {
            customerId: true,
            customer: {
              select: {
                id: true,
                name: true,
                customerAddressId: true,
              },
            },
          },
        },
      },
    });

    // 3) 筛选指定地址客户并去重
    const targetCustomers = new Map<string, CustomerBasicInfo>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        if (order.customer.customerAddressId === addressId) {
          const customerId = order.customerId;
          if (!targetCustomers.has(customerId)) {
            targetCustomers.set(customerId, {
              customerId: order.customer.id,
              customerName: order.customer.name,
            });
          }
        }
      }
    }

    return {
      customers: Array.from(targetCustomers.values()),
    };
  }

  /**
   * 获取供货商概况详情数据（多维度分析）
   * 口径约定：
   * - 时间：按团购发起时间 groupBuyStartDate 过滤；未传入则统计该供货商全量。
   * - 订单：仅统计 delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]。
   * - 金额：
   *   · 全额退款：销售额=0，利润=-成本（损益冲减）。
   *   · 部分退款：销售额与利润同时减去退款金额（仅退款不退货）。
   * - 订单量：仅计入 PAID/COMPLETED（退款不计订单量）。
   * - 客户与地域：基于订单关联客户/地址做去重统计。
   * 输出：
   * - 核心业绩、客户、商品、分类、地域、历史记录等多维度详情，用于详情页展示。
   */
  async getSupplierOverviewDetail(
    params: SupplierOverviewDetailParams,
  ): Promise<SupplierOverviewDetail> {
    // ================================================================
    // 步骤一：参数校验与供货商存在性检查
    // - 若供货商不存在，直接抛错
    // - 后续统计全部建立在合法供货商之上
    // ================================================================
    const { supplierId, startDate, endDate } = params;

    // 1. 获取供货商基本信息
    // 首先验证供货商是否存在，如果不存在则抛出错误
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '供货商不存在');
    }

    // ================================================================
    // 步骤二：拉取供货商团购与订单数据
    // - 查询策略：一次性拉取，避免 N+1
    // - 包含关系：团购 -> 产品 -> 分类；团购 -> 订单 -> 客户 -> 地址
    // - 时间过滤：groupBuyStartDate（若提供）
    // ================================================================
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        supplierId, // 指定供货商ID
        delete: 0, // 只查询未删除的团购单
        // 时间过滤：如果提供了时间参数，则只查询指定时间范围内的团购单
        // 如果没有提供时间参数，则查询该供货商的全部数据
        ...(startDate &&
          endDate && {
            groupBuyStartDate: {
              gte: startDate, // 团购发起时间 >= 开始时间
              lte: endDate, // 团购发起时间 <= 结束时间
            },
          }),
      },
      orderBy: {
        groupBuyStartDate: 'desc',
      },
      include: {
        product: {
          include: {
            productType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        order: {
          where: {
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
            customerId: true,
            createdAt: true,
            status: true,
            partialRefundAmount: true,
            customer: {
              select: {
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

    // ================================================================
    // 步骤三：初始化统计容器
    // - Map/Set：高效聚合与去重
    // - 指标容器：商品/分类/地域/历史等结构
    // ================================================================
    const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息
    const uniqueCustomerIds = new Set<string>(); // 去重客户ID集合
    const repeatCustomerIds = new Set<string>(); // 复购客户ID集合
    const customerPurchaseCounts = new Map<string, number>(); // 客户购买次数统计Map
    const productStats = new Map<string, ProductStatItem>(); // 商品统计Map
    const categoryStats = new Map<string, ProductCategoryStat>(); // 分类统计Map
    const regionalStats = new Map<
      string,
      { addressId: string; addressName: string; customerIds: Set<string> }
    >(); // 地域统计Map，使用Set去重客户
    const groupBuyHistory: GroupBuyLaunchHistory[] = []; // 团购历史记录数组
    // 为分类统计维护去重的商品ID集合，用于准确计算 productCount
    const categoryProductIds = new Map<string, Set<string>>();

    // 核心统计变量
    let totalRevenue = 0; // 总销售额
    let totalProfit = 0; // 总利润
    let totalRefundAmount = 0; // 总退款金额（部分退款+全额退款）
    let totalPartialRefundAmount = 0; // 总部分退款金额
    let totalRefundedOrderCount = 0; // 总全额退款订单数
    let totalPartialRefundOrderCount = 0; // 总部分退款订单数
    let totalOrderCount = 0; // 总订单量

    // ================================================================
    // 步骤四：逐团购与订单累计指标
    // - 金额口径：退款=负成本；部分退款直减
    // - 订单量：仅计 PAID/COMPLETED
    // - 侧写：同步累计商品/分类/地域/客户等多维指标
    // ================================================================
    for (const groupBuy of groupBuysWithOrders) {
      const groupBuyUnits = groupBuy.units as Array<GroupBuyUnit>; // 获取团购规格信息
      const groupBuyCustomerIds = new Set<string>(); // 该团购单的客户ID集合
      let groupBuyRevenue = 0; // 该团购单的销售额
      let groupBuyProfit = 0; // 该团购单的利润
      let groupBuyPartialRefundAmount = 0; // 该团购单的部分退款金额
      let groupBuyOrderCount = 0; // 该团购单的订单数

      // 将团购单的规格信息添加到units Map中
      // 规格信息包含价格和成本价，用于后续计算销售额和利润
      for (const unit of groupBuyUnits) {
        units.set(unit.id, unit);
      }

      // 遍历该团购单的所有订单，计算各项统计数据
      for (const order of groupBuy.order) {
        const unit = units.get(order.unitId);
        if (!unit) continue;

        const originalRevenue = unit.price * order.quantity;
        const originalProfit = (unit.price - unit.costPrice) * order.quantity;
        const partialRefundAmount = order.partialRefundAmount || 0;

        if (order.status === OrderStatus.REFUNDED) {
          // 全额退款：收入=0，利润=-成本；不计订单量/客户/地域
          const refundedCost = unit.costPrice * order.quantity;
          totalProfit += -refundedCost;
          groupBuyProfit += -refundedCost;
          totalRefundAmount += originalRevenue;
          totalRefundedOrderCount += 1;

          // 同步将负成本计入商品与分类的利润（不增加订单量/商品数量）
          const productKey = groupBuy.product.id;
          if (!productStats.has(productKey)) {
            productStats.set(productKey, {
              productId: groupBuy.product.id,
              productName: groupBuy.product.name,
              categoryId: groupBuy.product.productType.id,
              categoryName: groupBuy.product.productType.name,
              totalRevenue: 0,
              totalProfit: 0,
              totalRefundAmount: 0,
              totalPartialRefundAmount: 0,
              totalRefundedOrderCount: 0,
              totalPartialRefundOrderCount: 0,
              orderCount: 0,
              groupBuyCount: 0,
            });
          }
          const productStatRefund = productStats.get(productKey)!;
          // 商品维度：收入不变（0），利润累加负成本
          productStatRefund.totalProfit += -refundedCost;
          productStatRefund.totalRefundAmount += originalRevenue;
          productStatRefund.totalRefundedOrderCount += 1;

          const categoryKey = groupBuy.product.productType.id;
          if (!categoryStats.has(categoryKey)) {
            categoryStats.set(categoryKey, {
              categoryId: groupBuy.product.productType.id,
              categoryName: groupBuy.product.productType.name,
              totalRevenue: 0,
              totalProfit: 0,
              totalRefundAmount: 0,
              totalPartialRefundAmount: 0,
              totalRefundedOrderCount: 0,
              totalPartialRefundOrderCount: 0,
              orderCount: 0,
              productCount: 0,
              groupBuyCount: 0,
            });
          }
          const categoryStatRefund = categoryStats.get(categoryKey)!;
          // 分类维度：收入不变（0），利润累加负成本
          categoryStatRefund.totalProfit += -refundedCost;
          categoryStatRefund.totalRefundAmount += originalRevenue;
          categoryStatRefund.totalRefundedOrderCount += 1;

          continue;
        }

        // 已支付/已完成：仅退款不退货；部分退款按绝对额冲减
        const orderRevenue = originalRevenue - partialRefundAmount;
        const orderProfit = originalProfit - partialRefundAmount;

        // 累加到总体统计中
        totalRevenue += orderRevenue;
        totalProfit += orderProfit;
        totalPartialRefundAmount += partialRefundAmount;
        totalRefundAmount += partialRefundAmount;
        if (partialRefundAmount > 0) {
          totalPartialRefundOrderCount += 1;
        }
        totalOrderCount++;
        // 累加到当前团购单统计中
        groupBuyRevenue += orderRevenue;
        groupBuyProfit += orderProfit;
        groupBuyPartialRefundAmount += partialRefundAmount;
        groupBuyOrderCount++;

        // 添加客户ID到去重集合中
        uniqueCustomerIds.add(order.customerId);
        groupBuyCustomerIds.add(order.customerId);

        // 统计客户购买次数
        const currentCount = customerPurchaseCounts.get(order.customerId) || 0;
        customerPurchaseCounts.set(order.customerId, currentCount + 1);

        // 商品维度累计
        const productKey = groupBuy.product.id;
        if (!productStats.has(productKey)) {
          productStats.set(productKey, {
            productId: groupBuy.product.id,
            productName: groupBuy.product.name,
            categoryId: groupBuy.product.productType.id,
            categoryName: groupBuy.product.productType.name,
            totalRevenue: 0,
            totalProfit: 0,
            totalRefundAmount: 0,
            totalPartialRefundAmount: 0,
            totalRefundedOrderCount: 0,
            totalPartialRefundOrderCount: 0,
            orderCount: 0,
            groupBuyCount: 0,
          });
        }
        const productStat = productStats.get(productKey)!;
        productStat.totalRevenue += orderRevenue;
        productStat.totalProfit += orderProfit;
        productStat.orderCount++;

        // 商品级别退款统计
        if (partialRefundAmount > 0) {
          productStat.totalRefundAmount += partialRefundAmount;
          productStat.totalPartialRefundAmount += partialRefundAmount;
          productStat.totalPartialRefundOrderCount += 1;
        }

        // 分类维度累计
        const categoryKey = groupBuy.product.productType.id;
        if (!categoryStats.has(categoryKey)) {
          categoryStats.set(categoryKey, {
            categoryId: groupBuy.product.productType.id,
            categoryName: groupBuy.product.productType.name,
            totalRevenue: 0,
            totalProfit: 0,
            totalRefundAmount: 0,
            totalPartialRefundAmount: 0,
            totalRefundedOrderCount: 0,
            totalPartialRefundOrderCount: 0,
            orderCount: 0,
            productCount: 0,
            groupBuyCount: 0,
          });
        }
        const categoryStat = categoryStats.get(categoryKey)!;
        categoryStat.totalRevenue += orderRevenue;
        categoryStat.totalProfit += orderProfit;
        categoryStat.orderCount++;

        // 分类级别退款统计
        if (partialRefundAmount > 0) {
          categoryStat.totalRefundAmount += partialRefundAmount;
          categoryStat.totalPartialRefundAmount += partialRefundAmount;
          categoryStat.totalPartialRefundOrderCount += 1;
        }

        // 记录分类下出现过的商品ID（用于后续去重统计 productCount）
        if (!categoryProductIds.has(categoryKey)) {
          categoryProductIds.set(categoryKey, new Set<string>());
        }
        categoryProductIds.get(categoryKey)!.add(groupBuy.product.id);

        // 地域维度累计（以客户地址去重客户数）
        const addressId = order.customer.customerAddress?.id;
        const addressName = order.customer.customerAddress?.name || '未知地址';
        if (addressId) {
          if (!regionalStats.has(addressId)) {
            regionalStats.set(addressId, {
              addressId,
              addressName,
              customerIds: new Set<string>(),
            });
          }
          const regionalStat = regionalStats.get(addressId)!;
          // 仅在有效订单时计入地域去重客户
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            regionalStat.customerIds.add(order.customerId);
          }
        }
      }

      // 团购结束：计入对应商品/分类的团购次数（groupBuyCount）
      const productKey = groupBuy.product.id;
      const productStat = productStats.get(productKey);
      if (productStat) {
        productStat.groupBuyCount += 1;
      }
      const categoryKey = groupBuy.product.productType.id;
      const categoryStat = categoryStats.get(categoryKey);
      if (categoryStat) {
        categoryStat.groupBuyCount += 1;
      }

      // 组装团购历史项（用于详情页时间轴/列表展示）
      if (groupBuyOrderCount > 0) {
        // 计算该团购单的退款相关统计
        const refundedOrderCount = await this.prisma.order.count({
          where: {
            delete: 0,
            status: OrderStatus.REFUNDED,
            groupBuyId: groupBuy.id,
            ...(startDate && endDate
              ? {
                  groupBuy: {
                    groupBuyStartDate: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                }
              : {}),
          },
        });

        // 计算部分退款订单数
        const partialRefundOrderCount = await this.prisma.order.count({
          where: {
            delete: 0,
            status: {
              in: [OrderStatus.PAID, OrderStatus.COMPLETED],
            },
            groupBuyId: groupBuy.id,
            partialRefundAmount: {
              gt: 0,
            },
            ...(startDate && endDate
              ? {
                  groupBuy: {
                    groupBuyStartDate: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                }
              : {}),
          },
        });

        // 计算总退款金额（部分退款金额 + 全额退款金额）
        const refundedOrders = await this.prisma.order.findMany({
          where: {
            delete: 0,
            status: OrderStatus.REFUNDED,
            groupBuyId: groupBuy.id,
            ...(startDate && endDate
              ? {
                  groupBuy: {
                    groupBuyStartDate: {
                      gte: startDate,
                      lte: endDate,
                    },
                  },
                }
              : {}),
          },
          select: {
            quantity: true,
            unitId: true,
          },
        });

        let totalRefundAmount = groupBuyPartialRefundAmount; // 部分退款金额
        for (const order of refundedOrders) {
          const unit = units.get(order.unitId);
          if (unit) {
            totalRefundAmount += unit.price * order.quantity; // 全额退款金额
          }
        }

        groupBuyHistory.push({
          groupBuyId: groupBuy.id,
          groupBuyName: groupBuy.name,
          launchDate: groupBuy.groupBuyStartDate,
          orderCount: groupBuyOrderCount,
          revenue: groupBuyRevenue,
          profit: groupBuyProfit,
          totalRefundAmount,
          partialRefundOrderCount,
          customerCount: groupBuyCustomerIds.size,
          refundedOrderCount,
          totalRefundOrderCount: partialRefundOrderCount + refundedOrderCount,
        });
      }
    }

    // ================================================================
    // 步骤五：复购/多次购买客户统计
    // - repeat：购买次数>1 的客户
    // - 与上游 customerPurchaseCounts/uniqueCustomerIds 口径一致
    // ================================================================
    const customerOrderCounts = new Map<string, number>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        const count = customerOrderCounts.get(order.customerId) || 0;
        customerOrderCounts.set(order.customerId, count + 1);
      }
    }
    for (const [customerId, count] of customerOrderCounts) {
      if (count > 1) {
        repeatCustomerIds.add(customerId);
      }
    }

    // ================================================================
    // 步骤六：多次购买客户指标汇总
    // - multiPurchaseCustomerCount：购买次数>1 的客户数量
    // - multiPurchaseCustomerRatio：占去重客户数比例（%）
    // - 说明：供上层概况/详情统一展示复购相关指标
    // ================================================================
    const multiPurchaseCustomerCount = repeatCustomerIds.size;
    const multiPurchaseCustomerRatio =
      uniqueCustomerIds.size > 0
        ? (multiPurchaseCustomerCount / uniqueCustomerIds.size) * 100
        : 0;

    // 步骤七：分类维度补充统计
    // - 已移除产品维度的客户数统计（保持口径单一）
    // - 分类维度下的商品数按"去重商品ID"计算
    for (const [categoryKey, stat] of categoryStats.entries()) {
      const ids = categoryProductIds.get(categoryKey);
      stat.productCount = ids ? ids.size : 0;
    }

    // 步骤八：派生总体指标
    // - 平均利润率/平均客单价/复购客户数与比例/团购数与均值
    const averageProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageCustomerOrderValue =
      uniqueCustomerIds.size > 0 ? totalRevenue / uniqueCustomerIds.size : 0;
    const totalGroupBuyCount = groupBuysWithOrders.length;
    const averageGroupBuyRevenue =
      totalGroupBuyCount > 0 ? totalRevenue / totalGroupBuyCount : 0;
    const averageGroupBuyProfit =
      totalGroupBuyCount > 0 ? totalProfit / totalGroupBuyCount : 0;
    const averageGroupBuyOrderCount =
      totalGroupBuyCount > 0 ? totalOrderCount / totalGroupBuyCount : 0;

    // 步骤九：客户购买次数分布（用于频次分布图）
    const purchaseFrequencyMap = new Map<number, number>();
    for (const count of customerPurchaseCounts.values()) {
      const currentFreq = purchaseFrequencyMap.get(count) || 0;
      purchaseFrequencyMap.set(count, currentFreq + 1);
    }

    // 步骤十：基于"供货商团购数"动态分桶
    const buildBuckets = (
      gbCount: number,
    ): Array<{ min: number; max?: number | null }> => {
      if (gbCount >= 20) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: 9 },
          { min: 10, max: 19 },
          { min: 20, max: 39 },
          { min: 40, max: null },
        ];
      }
      if (gbCount >= 10) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: 9 },
          { min: 10, max: null },
        ];
      }
      if (gbCount >= 5) {
        return [
          { min: 1, max: 1 },
          { min: 2, max: 2 },
          { min: 3, max: 3 },
          { min: 4, max: 4 },
          { min: 5, max: null },
        ];
      }
      const buckets: Array<{ min: number; max?: number | null }> = [];
      for (let i = 1; i <= Math.max(1, gbCount); i += 1) {
        buckets.push({ min: i, max: i });
      }
      return buckets;
    };

    const buckets = buildBuckets(totalGroupBuyCount);

    const customerPurchaseFrequency: CustomerPurchaseFrequency[] = buckets
      .map((bucket) => {
        const { min, max } = bucket;
        let sum = 0;
        for (const [
          purchaseCount,
          customerCount,
        ] of purchaseFrequencyMap.entries()) {
          if (max == null) {
            if (purchaseCount >= min) sum += customerCount;
          } else if (purchaseCount >= min && purchaseCount <= max) {
            sum += customerCount;
          }
        }
        return {
          minFrequency: min,
          maxFrequency: max ?? null,
          count: sum,
        };
      })
      .filter((b) => b.count > 0);

    // 步骤十一：列表维度排序与截取
    // - 商品：按销售额降序排序（全部）
    // - 分类：按销售额降序排序（全部）
    // - 地域：按客户数降序排序
    const productStatsList = Array.from(productStats.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    const productCategoryStats = Array.from(categoryStats.values()).sort(
      (a, b) => b.totalRevenue - a.totalRevenue,
    );

    const regionalSales: RegionalSalesItem[] = Array.from(
      regionalStats.values(),
    )
      .map((stat) => ({
        addressId: stat.addressId,
        addressName: stat.addressName,
        customerCount: stat.customerIds.size, // 使用Set的size属性获取去重后的客户数量
      }))
      .sort((a, b) => b.customerCount - a.customerCount);

    // 步骤十二：团购历史按发起时间降序
    groupBuyHistory.sort(
      (a, b) =>
        new Date(b.launchDate).getTime() - new Date(a.launchDate).getTime(),
    );

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      startDate,
      endDate,
      totalRevenue,
      totalProfit,
      totalRefundAmount,
      totalPartialRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      averageProfitMargin,
      totalOrderCount,
      uniqueCustomerCount: uniqueCustomerIds.size,
      averageCustomerOrderValue,
      customerPurchaseFrequency,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      totalGroupBuyCount,
      averageGroupBuyRevenue,
      averageGroupBuyProfit,
      averageGroupBuyOrderCount,
      productStats: productStatsList,
      productCategoryStats,
      regionalSales,
      groupBuyHistory,
    };
  }
}
