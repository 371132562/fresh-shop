import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Product, Prisma, OrderStatus } from '@prisma/client';

import {
  ProductPageParams,
  ListByPage,
  ProductListItem,
  ProductOverviewParams,
  ProductOverviewResult,
  ProductOverviewListItem,
  ProductTypeOverviewParams,
  ProductTypeOverviewResult,
  ProductTypeOverviewListItem,
  ProductOverviewDetailParams,
  ProductOverviewDetail,
  ProductStatItem,
  SupplierStatItem,
  CustomerPurchaseFrequency,
  RegionalSalesItem,
  GroupBuyLaunchHistory,
  GroupBuyUnit,
  ProductFrequencyCustomersParams,
  ProductFrequencyCustomersResult,
  ProductRegionalCustomersParams,
  ProductRegionalCustomersResult,
  CustomerBasicInfo,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class ProductService {
  constructor(private prisma: PrismaService) {}

  async create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  async update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async list(data: ProductPageParams): Promise<ListByPage<ProductListItem[]>> {
    const {
      page,
      pageSize,
      name,
      productTypeIds,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = data;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      delete: 0,
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    if (productTypeIds && productTypeIds.length > 0) {
      where.productTypeId = {
        in: productTypeIds,
      };
    }

    // 对于统计字段，需要先获取所有数据进行全局排序，再分页
    if (
      sortField === 'orderCount' ||
      sortField === 'orderTotalAmount' ||
      sortField === 'groupBuyCount'
    ) {
      // 获取所有符合条件的商品数据（不分页）
      const [allProducts, totalCount] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          where,
          include: {
            productType: {
              select: {
                name: true,
              },
            },
            groupBuy: {
              where: {
                delete: 0,
              },
              include: {
                order: {
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
        this.prisma.product.count({ where }),
      ]);

      // 计算每个商品的统计数据
      const productsWithStats = allProducts.map((product) => {
        let orderCount = 0;
        let orderTotalAmount = 0;
        let groupBuyCount = 0;

        for (const groupBuy of product.groupBuy) {
          groupBuyCount++;
          // 解析units JSON数据
          const units = Array.isArray(groupBuy.units)
            ? (groupBuy.units as GroupBuyUnit[])
            : [];

          for (const order of groupBuy.order) {
            orderCount++;
            // 通过unitId找到对应的unit，计算金额
            const unit = units.find((u) => u.id === order.unitId);
            if (unit) {
              orderTotalAmount += unit.price * order.quantity;
            }
          }
        }

        return {
          ...product,
          productTypeName: product.productType?.name || '',
          orderCount,
          orderTotalAmount,
          groupBuyCount,
          productType: undefined,
          groupBuy: undefined,
        };
      });

      // 全局排序
      const sortedProducts = productsWithStats.sort((a, b) => {
        const aValue =
          sortField === 'orderCount'
            ? a.orderCount
            : sortField === 'orderTotalAmount'
              ? a.orderTotalAmount
              : a.groupBuyCount;
        const bValue =
          sortField === 'orderCount'
            ? b.orderCount
            : sortField === 'orderTotalAmount'
              ? b.orderTotalAmount
              : b.groupBuyCount;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      // 分页处理
      const paginatedProducts = sortedProducts.slice(skip, skip + pageSize);

      // 统计无订单商品数量（订单量为0的商品）
      const noOrderCount = productsWithStats.filter(
        (p) => p.orderCount === 0,
      ).length;

      return {
        data: paginatedProducts,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
      };
    } else {
      // 对于非统计字段（如createdAt），可以直接在数据库层面排序和分页
      let orderBy: Prisma.ProductOrderByWithRelationInput = {
        createdAt: 'desc',
      };
      if (sortField === 'createdAt') {
        orderBy = { createdAt: sortOrder };
      }

      const [products, totalCount] = await this.prisma.$transaction([
        this.prisma.product.findMany({
          skip: skip,
          take: pageSize,
          orderBy,
          where,
          include: {
            productType: {
              select: {
                name: true,
              },
            },
            groupBuy: {
              where: {
                delete: 0,
              },
              include: {
                order: {
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
        this.prisma.product.count({ where }),
      ]);

      // 计算每个商品的统计数据
      const productsWithStats = products.map((product) => {
        let orderCount = 0;
        let orderTotalAmount = 0;
        let groupBuyCount = 0;

        for (const groupBuy of product.groupBuy) {
          groupBuyCount++;
          // 解析units JSON数据
          const units = Array.isArray(groupBuy.units)
            ? (groupBuy.units as GroupBuyUnit[])
            : [];

          for (const order of groupBuy.order) {
            orderCount++;
            // 通过unitId找到对应的unit，计算金额
            const unit = units.find((u) => u.id === order.unitId);
            if (unit) {
              orderTotalAmount += unit.price * order.quantity;
            }
          }
        }

        return {
          ...product,
          productTypeName: product.productType?.name || '',
          orderCount,
          orderTotalAmount,
          groupBuyCount,
          productType: undefined,
          groupBuy: undefined,
        };
      });

      // 统计无订单商品数量（符合当前筛选条件且没有有效订单的商品）
      const noOrderCount = await this.prisma.product.count({
        where: {
          ...where,
          OR: [
            // 没有任何团购单
            { groupBuy: { none: { delete: 0 } } },
            // 有团购单但没有有效订单
            {
              groupBuy: {
                every: {
                  delete: 0,
                  order: {
                    none: {
                      delete: 0,
                      status: { in: [OrderStatus.PAID, OrderStatus.COMPLETED] },
                    },
                  },
                },
              },
            },
          ],
        },
      });

      return {
        data: productsWithStats,
        page: page,
        pageSize: pageSize,
        totalCount: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        noOrderCount,
      };
    }
  }

  async detail(id: string) {
    return this.prisma.product.findUnique({
      where: {
        id,
      },
    });
  }

  async delete(id: string) {
    const groupBuyCount = await this.prisma.groupBuy.count({
      where: {
        productId: id,
        delete: 0,
      },
    });

    if (groupBuyCount > 0) {
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        `该商品下存在关联的团购单（${groupBuyCount}条），无法删除。`,
      );
    }
    return this.prisma.product.update({
      where: {
        id,
      },
      data: {
        delete: 1,
      },
    });
  }

  async listAll() {
    return this.prisma.product.findMany({
      where: {
        delete: 0,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * 获取商品概况数据
   * 提供商品维度的概况分析接口，支持分页、搜索、排序等功能
   *
   * @param params 查询参数，包含时间范围、分页、搜索、排序等条件
   * @returns 商品概况分页结果
   *
   * 接口功能：
   * - 按商品维度统计销售、订单、客户等数据
   * - 支持按商品名称搜索
   * - 支持按商品类型筛选
   * - 支持多字段排序（销售额、利润、订单量等）
   * - 支持分页查询
   */
  async getProductOverview(
    params: ProductOverviewParams,
  ): Promise<ProductOverviewResult> {
    // ================================================================
    // 接口：商品概况列表（按商品维度）
    // 目标：聚合商品在指定时间范围内的核心指标并分页返回
    // 过滤：商品 delete=0；团购 delete=0；按 groupBuyStartDate 进行时间过滤
    // 订单口径：delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]
    // 指标口径：
    //   - 总销售额 totalRevenue：退款订单记 0；部分退款直减
    //   - 总利润 totalProfit：退款订单记 -成本；部分退款直减
    //   - 总订单量 totalOrderCount：仅计 PAID/COMPLETED
    //   - 参与客户数 uniqueCustomerCount：去重客户ID
    //   - 团购单数 totalGroupBuyCount：该商品匹配的团购数量
    //   - 平均利润率 averageProfitMargin：totalProfit/totalRevenue*100（分母为0时为0）
    // ================================================================
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      productName,
      productTypeIds,
      sortField = 'totalRevenue',
      sortOrder = 'desc',
    } = params;

    // 1) 构建商品查询条件（基础 + 名称模糊 + 类型筛选）
    const whereCondition = {
      delete: 0, // 只查询未删除的商品
      ...(productName && {
        name: {
          contains: productName, // 按商品名称模糊匹配
        },
      }),
      ...(productTypeIds &&
        productTypeIds.length > 0 && {
          productTypeId: {
            in: productTypeIds, // 按商品类型ID精确匹配
          },
        }),
    };

    // 2) 获取商品及其团购/订单数据（避免 N+1）
    // - 包含关系：商品 -> 团购单 -> 订单
    // - 时间过滤：groupBuyStartDate（若提供）
    const productsWithData = await this.prisma.product.findMany({
      where: whereCondition,
      include: {
        productType: {
          select: {
            id: true,
            name: true,
          },
        },
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

    // 3) 计算每个商品的统计数据
    // - 遍历团购与订单，按金额与口径累计
    // - 退款：收入=0，利润=-成本；部分退款：直减
    // - 订单量：仅计已支付/已完成
    const productStats: ProductOverviewListItem[] = [];

    for (const product of productsWithData) {
      // 初始化统计容器
      const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息，用于计算价格和利润
      const uniqueCustomerIds = new Set<string>(); // 去重客户ID，用于统计参与客户数
      let totalRevenue = 0; // 总销售额
      let totalProfit = 0; // 总利润
      let totalOrderCount = 0; // 总订单量
      let totalRefundAmount = 0; // 总退款金额（部分退款+全额退款）
      let totalPartialRefundAmount = 0; // 总部分退款金额
      let totalRefundedOrderCount = 0; // 总全额退款订单数
      let totalPartialRefundOrderCount = 0; // 总部分退款订单数

      // 遍历该商品的所有团购单
      for (const groupBuy of product.groupBuy) {
        const groupBuyUnits = groupBuy.units as GroupBuyUnit[];

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

            // 累加到商品总统计
            totalRevenue += orderRevenue;
            totalProfit += orderProfit;
            // 退款金额累计口径：
            // - 若订单已全额退款（REFUNDED），仅累计全额退款金额（原始收入），不叠加该单的部分退款，避免重复
            // - 否则仅累计部分退款金额
            if (order.status === OrderStatus.REFUNDED) {
              totalRefundAmount += originalRevenue;
              totalRefundedOrderCount += 1;
            } else if (partial > 0) {
              totalRefundAmount += partial;
              totalPartialRefundAmount += partial;
              totalPartialRefundOrderCount += 1;
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

      // 派生指标：利润率（总利润/总销售额*100）
      const totalProfitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // 构建商品统计结果对象
      productStats.push({
        productId: product.id,
        productName: product.name,
        productTypeId: product.productType.id,
        productTypeName: product.productType.name,
        totalRevenue, // 总销售额
        totalProfit, // 总利润
        totalOrderCount, // 总订单量
        totalRefundAmount, // 总退款金额
        totalPartialRefundAmount, // 总部分退款金额
        totalRefundedOrderCount, // 总全额退款订单数
        totalPartialRefundOrderCount, // 总部分退款订单数
        uniqueCustomerCount: uniqueCustomerIds.size, // 参与客户数（去重）
        totalGroupBuyCount: product.groupBuy.length, // 团购单数
        totalProfitMargin, // 利润率
      });
    }

    // 4) 排序处理（按指定字段与方向）
    productStats.sort((a, b) => {
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
        case 'totalProfitMargin': // 按利润率排序
          aValue = a.totalProfitMargin;
          bValue = b.totalProfitMargin;
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
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      // 根据排序方向返回比较结果
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // 5) 分页处理
    const totalCount = productStats.length;
    const skip = (page - 1) * pageSize;
    const paginatedResults = productStats.slice(skip, skip + pageSize);

    return {
      list: paginatedResults,
      total: totalCount,
      page,
      pageSize,
    };
  }

  /**
   * 获取商品类型概况数据
   * 提供商品类型维度的概况分析接口，支持分页、搜索、排序等功能
   *
   * @param params 查询参数，包含时间范围、分页、搜索、排序等条件
   * @returns 商品类型概况分页结果
   *
   * 接口功能：
   * - 按商品类型维度统计销售、订单、客户等数据
   * - 支持按商品类型名称搜索
   * - 支持多字段排序（销售额、利润、订单量等）
   * - 支持分页查询
   */
  async getProductTypeOverview(
    params: ProductTypeOverviewParams,
  ): Promise<ProductTypeOverviewResult> {
    // ================================================================
    // 接口：商品类型概况列表（按商品类型维度）
    // 目标：聚合商品类型在指定时间范围内的核心指标并分页返回
    // 过滤：商品类型 delete=0；商品 delete=0；团购 delete=0；按 groupBuyStartDate 进行时间过滤
    // 订单口径：delete=0 且状态 ∈ [PAID, COMPLETED, REFUNDED]
    // 指标口径：
    //   - 总销售额 totalRevenue：退款订单记 0；部分退款直减
    //   - 总利润 totalProfit：退款订单记 -成本；部分退款直减
    //   - 总订单量 totalOrderCount：仅计 PAID/COMPLETED
    //   - 参与客户数 uniqueCustomerCount：去重客户ID
    //   - 团购单数 totalGroupBuyCount：该类型下所有商品的团购数量
    //   - 商品数量 productCount：该类型下的商品数量
    //   - 平均利润率 averageProfitMargin：totalProfit/totalRevenue*100（分母为0时为0）
    // ================================================================
    const {
      startDate,
      endDate,
      page = 1,
      pageSize = 10,
      productTypeName,
      sortField = 'totalRevenue',
      sortOrder = 'desc',
    } = params;

    // 1) 构建商品类型查询条件（基础 + 名称模糊）
    const whereCondition = {
      delete: 0, // 只查询未删除的商品类型
      ...(productTypeName && {
        name: {
          contains: productTypeName, // 按商品类型名称模糊匹配
        },
      }),
    };

    // 2) 获取商品类型及其关联的商品/团购/订单数据（避免 N+1）
    // - 包含关系：商品类型 -> 商品 -> 团购单 -> 订单
    // - 时间过滤：groupBuyStartDate（若提供）
    const productTypesWithData = await this.prisma.productType.findMany({
      where: whereCondition,
      include: {
        product: {
          where: {
            delete: 0, // 只查询未删除的商品
          },
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
        },
      },
    });

    // 3) 计算每个商品类型的统计数据
    // - 遍历商品、团购与订单，按金额与口径累计
    // - 退款：收入=0，利润=-成本；部分退款：直减
    // - 订单量：仅计已支付/已完成
    const productTypeStats: ProductTypeOverviewListItem[] = [];

    for (const productType of productTypesWithData) {
      // 初始化统计容器
      const units = new Map<string, GroupBuyUnit>(); // 存储团购规格信息，用于计算价格和利润
      const uniqueCustomerIds = new Set<string>(); // 去重客户ID，用于统计参与客户数
      let totalRevenue = 0; // 总销售额
      let totalProfit = 0; // 总利润
      let totalOrderCount = 0; // 总订单量
      let totalRefundAmount = 0; // 总退款金额（部分退款+全额退款）
      let totalPartialRefundAmount = 0; // 总部分退款金额
      let totalRefundedOrderCount = 0; // 总全额退款订单数
      let totalPartialRefundOrderCount = 0; // 总部分退款订单数
      let totalGroupBuyCount = 0; // 总团购单数

      // 遍历该商品类型下的所有商品
      for (const product of productType.product) {
        // 遍历该商品的所有团购单
        for (const groupBuy of product.groupBuy) {
          totalGroupBuyCount++; // 累计团购单数
          const groupBuyUnits = groupBuy.units as GroupBuyUnit[];

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

              // 累加到商品类型总统计
              totalRevenue += orderRevenue;
              totalProfit += orderProfit;
              // 退款金额累计口径：
              // - 若订单已全额退款（REFUNDED），仅累计全额退款金额（原始收入），不叠加该单的部分退款，避免重复
              // - 否则仅累计部分退款金额
              if (order.status === OrderStatus.REFUNDED) {
                totalRefundAmount += originalRevenue;
                totalRefundedOrderCount += 1;
              } else if (partial > 0) {
                totalRefundAmount += partial;
                totalPartialRefundAmount += partial;
                totalPartialRefundOrderCount += 1;
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
      }

      // 派生指标：利润率（总利润/总销售额*100）
      const totalProfitMargin =
        totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

      // 构建商品类型统计结果对象
      productTypeStats.push({
        productTypeId: productType.id,
        productTypeName: productType.name,
        productCount: productType.product.length, // 该类型下的商品数量
        totalRevenue, // 总销售额
        totalProfit, // 总利润
        totalOrderCount, // 总订单量
        totalRefundAmount, // 总退款金额
        totalPartialRefundAmount, // 总部分退款金额
        totalRefundedOrderCount, // 总全额退款订单数
        totalPartialRefundOrderCount, // 总部分退款订单数
        uniqueCustomerCount: uniqueCustomerIds.size, // 参与客户数（去重）
        totalGroupBuyCount, // 团购单数
        totalProfitMargin, // 利润率
      });
    }

    // 4) 排序处理（按指定字段与方向）
    productTypeStats.sort((a, b) => {
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
        case 'totalProfitMargin': // 按利润率排序
          aValue = a.totalProfitMargin;
          bValue = b.totalProfitMargin;
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
        case 'productCount': // 按商品数量排序
          aValue = a.productCount;
          bValue = b.productCount;
          break;
        default:
          aValue = a.totalRevenue;
          bValue = b.totalRevenue;
      }

      // 根据排序方向返回比较结果
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    // 5) 分页处理
    const totalCount = productTypeStats.length;
    const skip = (page - 1) * pageSize;
    const paginatedResults = productTypeStats.slice(skip, skip + pageSize);

    return {
      list: paginatedResults,
      total: totalCount,
      page,
      pageSize,
    };
  }

  /**
   * 获取商品概况详情数据
   * 提供商品或商品类型的详细分析接口，包含多维度统计数据
   *
   * @param params 查询参数，包含商品ID或商品类型ID、维度类型和时间范围
   * @returns 商品概况详情数据，包含多维度分析结果
   *
   * 接口功能：
   * - 获取特定商品或商品类型的详细统计数据
   * - 包含核心业绩、客户分析、产品分析、地域分析等
   * - 提供团购历史记录和热销产品排行
   * - 支持时间范围过滤
   */
  async getProductOverviewDetail(
    params: ProductOverviewDetailParams,
  ): Promise<ProductOverviewDetail> {
    const { productId, productTypeId, dimension, startDate, endDate } = params;

    if (dimension === 'product') {
      // 商品维度详情统计
      return this.getProductDetail(productId!, startDate, endDate);
    } else {
      // 商品类型维度详情统计
      return this.getProductTypeDetail(productTypeId!, startDate, endDate);
    }
  }

  /**
   * 获取商品详情数据
   * 针对特定商品的详细统计分析
   */
  private async getProductDetail(
    productId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProductOverviewDetail> {
    // 1. 获取商品基本信息
    const product = await this.prisma.product.findUnique({
      where: { id: productId, delete: 0 },
      include: {
        productType: {
          select: { id: true, name: true },
        },
      },
    });

    if (!product) {
      throw new BusinessException(ErrorCode.RESOURCE_NOT_FOUND, '商品不存在');
    }

    // 2. 获取商品相关的团购和订单数据
    const groupBuysWithOrders = await this.prisma.groupBuy.findMany({
      where: {
        productId,
        delete: 0,
        ...(startDate &&
          endDate && {
            groupBuyStartDate: { gte: startDate, lte: endDate },
          }),
      },
      include: {
        supplier: { select: { id: true, name: true } },
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
            status: true,
            partialRefundAmount: true,
            customer: {
              select: {
                customerAddress: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    // 3. 计算统计数据
    const units = new Map<string, GroupBuyUnit>();
    const uniqueCustomerIds = new Set<string>();
    const supplierStats = new Map<string, SupplierStatItem>();
    const regionalStats = new Map<
      string,
      { addressId: string; addressName: string; customerIds: Set<string> }
    >();
    const groupBuyHistory: GroupBuyLaunchHistory[] = [];

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalRefundAmount = 0;
    let totalPartialRefundAmount = 0;
    let totalRefundedOrderCount = 0;
    let totalPartialRefundOrderCount = 0;
    let totalOrderCount = 0;
    let totalGroupBuyCount = 0;

    for (const groupBuy of groupBuysWithOrders) {
      totalGroupBuyCount++;
      const groupBuyUnits = groupBuy.units as GroupBuyUnit[];

      for (const unit of groupBuyUnits) {
        units.set(unit.id, unit);
      }

      let groupBuyRevenue = 0;
      let groupBuyProfit = 0;
      let groupBuyRefundAmount = 0;
      let groupBuyRefundedOrderCount = 0;
      let groupBuyPartialRefundOrderCount = 0;
      let groupBuyOrderCount = 0;
      const groupBuyCustomerIds = new Set<string>();

      for (const order of groupBuy.order) {
        const unit = units.get(order.unitId);
        if (!unit) continue;

        const originalRevenue = unit.price * order.quantity;
        const originalProfit = (unit.price - unit.costPrice) * order.quantity;
        const partial = order.partialRefundAmount || 0;

        const orderRevenue =
          order.status === OrderStatus.REFUNDED ? 0 : originalRevenue - partial;
        const orderProfit =
          order.status === OrderStatus.REFUNDED
            ? -(unit.costPrice * order.quantity)
            : originalProfit - partial;

        totalRevenue += orderRevenue;
        totalProfit += orderProfit;
        groupBuyRevenue += orderRevenue;
        groupBuyProfit += orderProfit;

        if (order.status === OrderStatus.REFUNDED) {
          totalRefundAmount += originalRevenue;
          totalRefundedOrderCount += 1;
          groupBuyRefundAmount += originalRevenue;
          groupBuyRefundedOrderCount += 1;
        } else if (partial > 0) {
          totalRefundAmount += partial;
          totalPartialRefundAmount += partial;
          totalPartialRefundOrderCount += 1;
          groupBuyRefundAmount += partial;
          groupBuyPartialRefundOrderCount += 1;
        }

        // 统计供货商数据（所有订单都统计）
        const supplierKey = groupBuy.supplier.id;
        if (!supplierStats.has(supplierKey)) {
          supplierStats.set(supplierKey, {
            supplierId: groupBuy.supplier.id,
            supplierName: groupBuy.supplier.name,
            totalRevenue: 0,
            totalProfit: 0,
            orderCount: 0,
            groupBuyCount: 0,
            totalRefundAmount: 0,
            totalPartialRefundAmount: 0,
            totalRefundedOrderCount: 0,
            totalPartialRefundOrderCount: 0,
          });
        }
        const supplierStat = supplierStats.get(supplierKey)!;
        supplierStat.totalRevenue += orderRevenue;
        supplierStat.totalProfit += orderProfit;
        supplierStat.orderCount += 1;

        // 统计退款数据
        if (order.status === OrderStatus.REFUNDED) {
          supplierStat.totalRefundAmount += originalRevenue;
          supplierStat.totalRefundedOrderCount += 1;
        } else if (partial > 0) {
          supplierStat.totalRefundAmount += partial;
          supplierStat.totalPartialRefundAmount += partial;
          supplierStat.totalPartialRefundOrderCount += 1;
        }

        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.COMPLETED
        ) {
          totalOrderCount++;
          groupBuyOrderCount++;
          uniqueCustomerIds.add(order.customerId);
          groupBuyCustomerIds.add(order.customerId);

          // 统计地域数据
          if (order.customer?.customerAddress) {
            const addressKey = order.customer.customerAddress.id;
            if (!regionalStats.has(addressKey)) {
              regionalStats.set(addressKey, {
                addressId: order.customer.customerAddress.id,
                addressName: order.customer.customerAddress.name,
                customerIds: new Set(),
              });
            }
            regionalStats.get(addressKey)!.customerIds.add(order.customerId);
          }
        }
      }

      // 记录团购历史
      groupBuyHistory.push({
        groupBuyId: groupBuy.id,
        groupBuyName: groupBuy.name,
        supplierId: groupBuy.supplier.id,
        supplierName: groupBuy.supplier.name,
        launchDate: groupBuy.groupBuyStartDate,
        revenue: groupBuyRevenue,
        profit: groupBuyProfit,
        orderCount: groupBuyOrderCount,
        customerCount: groupBuyCustomerIds.size,
        totalRefundAmount: groupBuyRefundAmount,
        partialRefundOrderCount: groupBuyPartialRefundOrderCount,
        refundedOrderCount: groupBuyRefundedOrderCount,
        totalRefundOrderCount:
          groupBuyPartialRefundOrderCount + groupBuyRefundedOrderCount,
      });

      // 更新供货商团购单数
      const supplierKey = groupBuy.supplier.id;
      if (supplierStats.has(supplierKey)) {
        supplierStats.get(supplierKey)!.groupBuyCount += 1;
      }
    }

    // 4. 构建客户购买频次数据（使用动态分桶逻辑）
    const customerPurchaseCounts = new Map<string, number>();

    // 统计每个客户的购买次数
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.COMPLETED
        ) {
          const currentCount =
            customerPurchaseCounts.get(order.customerId) || 0;
          customerPurchaseCounts.set(order.customerId, currentCount + 1);
        }
      }
    }

    // 根据团购单数量动态规划分桶：
    // - >=20: 1,2,3,4, 5-9, 10-19, 20-39, 40+
    // - >=10: 1,2,3,4, 5-9, 10+
    // - >=5:  1,2,3,4, 5+
    // - 其他: 1..totalGroupBuyCount（逐一列出）
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
      // gbCount < 5 的情况，逐一列出存在的次数
      const buckets: Array<{ min: number; max?: number | null }> = [];
      for (let i = 1; i <= Math.max(1, gbCount); i += 1) {
        buckets.push({ min: i, max: i });
      }
      return buckets;
    };

    const buckets = buildBuckets(totalGroupBuyCount);

    // 按购买次数分组统计
    const purchaseFrequencyMap = new Map<number, number>();
    for (const count of customerPurchaseCounts.values()) {
      const currentFreq = purchaseFrequencyMap.get(count) || 0;
      purchaseFrequencyMap.set(count, currentFreq + 1);
    }

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

    // 5. 构建地域销售数据（按客户数量倒序排列）
    const regionalSales: RegionalSalesItem[] = Array.from(
      regionalStats.values(),
    )
      .map((stat) => ({
        addressId: stat.addressId,
        addressName: stat.addressName,
        customerCount: stat.customerIds.size,
        totalRevenue: 0, // 地域销售额需要重新计算
        totalOrderCount: 0, // 地域订单量需要重新计算
      }))
      .sort((a, b) => b.customerCount - a.customerCount);

    const totalProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageCustomerOrderValue =
      uniqueCustomerIds.size > 0 ? totalRevenue / uniqueCustomerIds.size : 0;
    const averageGroupBuyRevenue =
      totalGroupBuyCount > 0 ? totalRevenue / totalGroupBuyCount : 0;
    const averageGroupBuyProfit =
      totalGroupBuyCount > 0 ? totalProfit / totalGroupBuyCount : 0;
    const averageGroupBuyOrderCount =
      totalGroupBuyCount > 0 ? totalOrderCount / totalGroupBuyCount : 0;

    // 计算多次购买客户统计
    const customerOrderCounts = new Map<string, number>();
    for (const groupBuy of groupBuysWithOrders) {
      for (const order of groupBuy.order) {
        if (
          order.status === OrderStatus.PAID ||
          order.status === OrderStatus.COMPLETED
        ) {
          const count = customerOrderCounts.get(order.customerId) || 0;
          customerOrderCounts.set(order.customerId, count + 1);
        }
      }
    }

    const multiPurchaseCustomerIds = new Set<string>();
    for (const [customerId, count] of customerOrderCounts) {
      if (count > 1) {
        multiPurchaseCustomerIds.add(customerId);
      }
    }

    const multiPurchaseCustomerCount = multiPurchaseCustomerIds.size;
    const multiPurchaseCustomerRatio =
      uniqueCustomerIds.size > 0
        ? (multiPurchaseCustomerCount / uniqueCustomerIds.size) * 100
        : 0;

    // 按发起时间排序团购历史（从新到旧）
    groupBuyHistory.sort(
      (a, b) => b.launchDate.getTime() - a.launchDate.getTime(),
    );

    return {
      productId: product.id,
      productName: product.name,
      dimension: 'product',
      startDate,
      endDate,
      totalRevenue,
      totalProfit,
      totalProfitMargin,
      totalOrderCount,
      totalRefundAmount,
      totalPartialRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      uniqueCustomerCount: uniqueCustomerIds.size,
      totalGroupBuyCount,
      averageGroupBuyRevenue,
      averageGroupBuyProfit,
      averageGroupBuyOrderCount,
      averageCustomerOrderValue,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      supplierStats: Array.from(supplierStats.values()),
      customerPurchaseFrequency,
      regionalSales,
      groupBuyHistory,
    };
  }

  /**
   * 获取商品类型详情数据
   * 针对特定商品类型的详细统计分析
   */
  private async getProductTypeDetail(
    productTypeId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<ProductOverviewDetail> {
    // 1. 获取商品类型基本信息
    const productType = await this.prisma.productType.findUnique({
      where: { id: productTypeId, delete: 0 },
    });

    if (!productType) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        '商品类型不存在',
      );
    }

    // 2. 获取该类型下的所有商品及其团购和订单数据
    const productsWithData = await this.prisma.product.findMany({
      where: {
        productTypeId,
        delete: 0,
      },
      include: {
        groupBuy: {
          where: {
            delete: 0,
            ...(startDate &&
              endDate && {
                groupBuyStartDate: { gte: startDate, lte: endDate },
              }),
          },
          include: {
            supplier: { select: { id: true, name: true } },
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
                status: true,
                partialRefundAmount: true,
                customer: {
                  select: {
                    customerAddress: {
                      select: { id: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // 3. 计算统计数据（类似商品详情，但按商品类型聚合）
    const units = new Map<string, GroupBuyUnit>();
    const uniqueCustomerIds = new Set<string>();
    const supplierStats = new Map<string, SupplierStatItem>();
    const regionalStats = new Map<
      string,
      { addressId: string; addressName: string; customerIds: Set<string> }
    >();
    const groupBuyHistory: GroupBuyLaunchHistory[] = [];

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalRefundAmount = 0;
    let totalPartialRefundAmount = 0;
    let totalRefundedOrderCount = 0;
    let totalPartialRefundOrderCount = 0;
    let totalOrderCount = 0;
    let totalGroupBuyCount = 0;

    // 按商品统计
    const productStatsMap = new Map<string, ProductStatItem>();

    for (const product of productsWithData) {
      let productRevenue = 0;
      let productProfit = 0;
      let productRefundAmount = 0;
      let productPartialRefundAmount = 0;
      let productRefundedOrderCount = 0;
      let productPartialRefundOrderCount = 0;
      let productOrderCount = 0;
      let productGroupBuyCount = 0;

      for (const groupBuy of product.groupBuy) {
        totalGroupBuyCount++;
        productGroupBuyCount++;
        const groupBuyUnits = groupBuy.units as GroupBuyUnit[];

        for (const unit of groupBuyUnits) {
          units.set(unit.id, unit);
        }

        let groupBuyRevenue = 0;
        let groupBuyProfit = 0;
        let groupBuyRefundAmount = 0;
        let groupBuyRefundedOrderCount = 0;
        let groupBuyPartialRefundOrderCount = 0;
        let groupBuyOrderCount = 0;
        const groupBuyCustomerIds = new Set<string>();

        for (const order of groupBuy.order) {
          const unit = units.get(order.unitId);
          if (!unit) continue;

          const originalRevenue = unit.price * order.quantity;
          const originalProfit = (unit.price - unit.costPrice) * order.quantity;
          const partial = order.partialRefundAmount || 0;

          const orderRevenue =
            order.status === OrderStatus.REFUNDED
              ? 0
              : originalRevenue - partial;
          const orderProfit =
            order.status === OrderStatus.REFUNDED
              ? -(unit.costPrice * order.quantity)
              : originalProfit - partial;

          totalRevenue += orderRevenue;
          totalProfit += orderProfit;
          productRevenue += orderRevenue;
          productProfit += orderProfit;
          groupBuyRevenue += orderRevenue;
          groupBuyProfit += orderProfit;

          if (order.status === OrderStatus.REFUNDED) {
            totalRefundAmount += originalRevenue;
            totalRefundedOrderCount += 1;
            productRefundAmount += originalRevenue;
            productRefundedOrderCount += 1;
            groupBuyRefundAmount += originalRevenue;
            groupBuyRefundedOrderCount += 1;
          } else if (partial > 0) {
            totalRefundAmount += partial;
            totalPartialRefundAmount += partial;
            totalPartialRefundOrderCount += 1;
            productRefundAmount += partial;
            productPartialRefundAmount += partial;
            productPartialRefundOrderCount += 1;
            groupBuyRefundAmount += partial;
            groupBuyPartialRefundOrderCount += 1;
          }

          // 统计供货商数据（所有订单都统计）
          const supplierKey = groupBuy.supplier.id;
          if (!supplierStats.has(supplierKey)) {
            supplierStats.set(supplierKey, {
              supplierId: groupBuy.supplier.id,
              supplierName: groupBuy.supplier.name,
              totalRevenue: 0,
              totalProfit: 0,
              orderCount: 0,
              groupBuyCount: 0,
              totalRefundAmount: 0,
              totalPartialRefundAmount: 0,
              totalRefundedOrderCount: 0,
              totalPartialRefundOrderCount: 0,
            });
          }
          const supplierStat = supplierStats.get(supplierKey)!;
          supplierStat.totalRevenue += orderRevenue;
          supplierStat.totalProfit += orderProfit;
          supplierStat.orderCount += 1;

          // 统计退款数据
          if (order.status === OrderStatus.REFUNDED) {
            supplierStat.totalRefundAmount += originalRevenue;
            supplierStat.totalRefundedOrderCount += 1;
          } else if (partial > 0) {
            supplierStat.totalRefundAmount += partial;
            supplierStat.totalPartialRefundAmount += partial;
            supplierStat.totalPartialRefundOrderCount += 1;
          }

          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            totalOrderCount++;
            productOrderCount++;
            groupBuyOrderCount++;
            uniqueCustomerIds.add(order.customerId);
            groupBuyCustomerIds.add(order.customerId);

            // 统计地域数据
            if (order.customer?.customerAddress) {
              const addressKey = order.customer.customerAddress.id;
              if (!regionalStats.has(addressKey)) {
                regionalStats.set(addressKey, {
                  addressId: order.customer.customerAddress.id,
                  addressName: order.customer.customerAddress.name,
                  customerIds: new Set(),
                });
              }
              regionalStats.get(addressKey)!.customerIds.add(order.customerId);
            }
          }
        }

        // 记录团购历史
        groupBuyHistory.push({
          groupBuyId: groupBuy.id,
          groupBuyName: groupBuy.name,
          supplierId: groupBuy.supplier.id,
          supplierName: groupBuy.supplier.name,
          launchDate: groupBuy.groupBuyStartDate,
          revenue: groupBuyRevenue,
          profit: groupBuyProfit,
          orderCount: groupBuyOrderCount,
          customerCount: groupBuyCustomerIds.size,
          totalRefundAmount: groupBuyRefundAmount,
          partialRefundOrderCount: groupBuyPartialRefundOrderCount,
          refundedOrderCount: groupBuyRefundedOrderCount,
          totalRefundOrderCount:
            groupBuyPartialRefundOrderCount + groupBuyRefundedOrderCount,
        });

        // 更新供货商团购单数
        const supplierKey = groupBuy.supplier.id;
        if (supplierStats.has(supplierKey)) {
          supplierStats.get(supplierKey)!.groupBuyCount += 1;
        }
      }

      // 记录商品统计
      if (productRevenue > 0 || productOrderCount > 0) {
        productStatsMap.set(product.id, {
          productId: product.id,
          productName: product.name,
          categoryId: productType.id,
          categoryName: productType.name,
          totalRevenue: productRevenue,
          totalProfit: productProfit,
          totalRefundAmount: productRefundAmount,
          totalPartialRefundAmount: productPartialRefundAmount,
          totalRefundedOrderCount: productRefundedOrderCount,
          totalPartialRefundOrderCount: productPartialRefundOrderCount,
          orderCount: productOrderCount,
          groupBuyCount: productGroupBuyCount,
        });
      }
    }

    // 4. 构建客户购买频次数据（使用动态分桶逻辑）
    const customerPurchaseCounts = new Map<string, number>();

    // 统计每个客户的购买次数
    for (const product of productsWithData) {
      for (const groupBuy of product.groupBuy) {
        for (const order of groupBuy.order) {
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            const currentCount =
              customerPurchaseCounts.get(order.customerId) || 0;
            customerPurchaseCounts.set(order.customerId, currentCount + 1);
          }
        }
      }
    }

    // 根据团购单数量动态规划分桶：
    // - >=20: 1,2,3,4, 5-9, 10-19, 20-39, 40+
    // - >=10: 1,2,3,4, 5-9, 10+
    // - >=5:  1,2,3,4, 5+
    // - 其他: 1..totalGroupBuyCount（逐一列出）
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
      // gbCount < 5 的情况，逐一列出存在的次数
      const buckets: Array<{ min: number; max?: number | null }> = [];
      for (let i = 1; i <= Math.max(1, gbCount); i += 1) {
        buckets.push({ min: i, max: i });
      }
      return buckets;
    };

    const buckets = buildBuckets(totalGroupBuyCount);

    // 按购买次数分组统计
    const purchaseFrequencyMap = new Map<number, number>();
    for (const count of customerPurchaseCounts.values()) {
      const currentFreq = purchaseFrequencyMap.get(count) || 0;
      purchaseFrequencyMap.set(count, currentFreq + 1);
    }

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

    const regionalSales: RegionalSalesItem[] = Array.from(
      regionalStats.values(),
    )
      .map((stat) => ({
        addressId: stat.addressId,
        addressName: stat.addressName,
        customerCount: stat.customerIds.size,
        totalRevenue: 0,
        totalOrderCount: 0,
      }))
      .sort((a, b) => b.customerCount - a.customerCount);

    const totalProfitMargin =
      totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const averageCustomerOrderValue =
      uniqueCustomerIds.size > 0 ? totalRevenue / uniqueCustomerIds.size : 0;
    const averageGroupBuyRevenue =
      totalGroupBuyCount > 0 ? totalRevenue / totalGroupBuyCount : 0;
    const averageGroupBuyProfit =
      totalGroupBuyCount > 0 ? totalProfit / totalGroupBuyCount : 0;
    const averageGroupBuyOrderCount =
      totalGroupBuyCount > 0 ? totalOrderCount / totalGroupBuyCount : 0;

    // 计算多次购买客户统计
    const customerOrderCounts = new Map<string, number>();
    for (const product of productsWithData) {
      for (const groupBuy of product.groupBuy) {
        for (const order of groupBuy.order) {
          if (
            order.status === OrderStatus.PAID ||
            order.status === OrderStatus.COMPLETED
          ) {
            const count = customerOrderCounts.get(order.customerId) || 0;
            customerOrderCounts.set(order.customerId, count + 1);
          }
        }
      }
    }

    const multiPurchaseCustomerIds = new Set<string>();
    for (const [customerId, count] of customerOrderCounts) {
      if (count > 1) {
        multiPurchaseCustomerIds.add(customerId);
      }
    }

    const multiPurchaseCustomerCount = multiPurchaseCustomerIds.size;
    const multiPurchaseCustomerRatio =
      uniqueCustomerIds.size > 0
        ? (multiPurchaseCustomerCount / uniqueCustomerIds.size) * 100
        : 0;

    // 按发起时间排序团购历史（从新到旧）
    groupBuyHistory.sort(
      (a, b) => b.launchDate.getTime() - a.launchDate.getTime(),
    );

    return {
      productTypeId: productType.id,
      productTypeName: productType.name,
      dimension: 'productType',
      startDate,
      endDate,
      totalRevenue,
      totalProfit,
      totalProfitMargin,
      totalOrderCount,
      totalRefundAmount,
      totalPartialRefundAmount,
      totalRefundedOrderCount,
      totalPartialRefundOrderCount,
      uniqueCustomerCount: uniqueCustomerIds.size,
      totalGroupBuyCount,
      averageGroupBuyRevenue,
      averageGroupBuyProfit,
      averageGroupBuyOrderCount,
      averageCustomerOrderValue,
      multiPurchaseCustomerCount,
      multiPurchaseCustomerRatio,
      productStats: Array.from(productStatsMap.values()),
      productCount: productsWithData.length,
      supplierStats: Array.from(supplierStats.values()),
      customerPurchaseFrequency,
      regionalSales,
      groupBuyHistory,
    };
  }

  /**
   * 获取商品相关客户购买频次数据
   * 根据商品或商品类型维度查询特定购买频次的客户列表
   */
  async getProductFrequencyCustomers(
    params: ProductFrequencyCustomersParams,
  ): Promise<ProductFrequencyCustomersResult> {
    const {
      productId,
      productTypeId,
      dimension,
      minFrequency,
      maxFrequency,
      startDate,
      endDate,
    } = params;

    // 构建查询条件
    const whereCondition: Prisma.ProductWhereInput = {
      delete: 0,
      groupBuy: {
        some: {
          order: {
            some: {
              status: {
                in: [OrderStatus.PAID, OrderStatus.COMPLETED],
              },
            },
          },
        },
      },
    };

    if (dimension === 'product' && productId) {
      whereCondition.id = productId;
    } else if (dimension === 'productType' && productTypeId) {
      whereCondition.productTypeId = productTypeId;
    } else {
      throw new BusinessException(ErrorCode.INVALID_INPUT, '参数错误');
    }

    // 获取商品数据
    const products = await this.prisma.product.findMany({
      where: whereCondition,
      include: {
        groupBuy: {
          where: {
            delete: 0,
            ...(startDate &&
              endDate && {
                groupBuyStartDate: {
                  gte: startDate,
                  lte: endDate,
                },
              }),
          },
          include: {
            order: {
              where: {
                status: {
                  in: [OrderStatus.PAID, OrderStatus.COMPLETED],
                },
              },
              include: {
                customer: true,
              },
            },
          },
        },
      },
    });

    // 统计客户购买次数
    const customerOrderCounts = new Map<string, number>();
    for (const product of products) {
      for (const groupBuy of product.groupBuy) {
        for (const order of groupBuy.order) {
          const count = customerOrderCounts.get(order.customerId) || 0;
          customerOrderCounts.set(order.customerId, count + 1);
        }
      }
    }

    // 筛选符合频次条件的客户
    const filteredCustomers: CustomerBasicInfo[] = [];
    for (const [customerId, count] of customerOrderCounts) {
      const meetsCondition = maxFrequency
        ? count >= minFrequency && count <= maxFrequency
        : count >= minFrequency;

      if (meetsCondition) {
        // 获取客户信息
        const customer = await this.prisma.customer.findUnique({
          where: { id: customerId },
          include: {
            customerAddress: true,
          },
        });

        if (customer) {
          filteredCustomers.push({
            customerId: customer.id,
            customerName: customer.name,
            customerAddressName: customer.customerAddress?.name,
            purchaseCount: count,
          });
        }
      }
    }

    return { customers: filteredCustomers };
  }

  /**
   * 获取商品相关客户地域数据
   * 根据商品或商品类型维度和地址查询客户列表
   */
  async getProductRegionalCustomers(
    params: ProductRegionalCustomersParams,
  ): Promise<ProductRegionalCustomersResult> {
    const {
      productId,
      productTypeId,
      dimension,
      addressId,
      startDate,
      endDate,
    } = params;

    // 构建查询条件
    const whereCondition: Prisma.ProductWhereInput = {
      delete: 0,
      groupBuy: {
        some: {
          order: {
            some: {
              status: {
                in: [OrderStatus.PAID, OrderStatus.COMPLETED],
              },
              customer: {
                customerAddressId: addressId,
              },
            },
          },
        },
      },
    };

    if (dimension === 'product' && productId) {
      whereCondition.id = productId;
    } else if (dimension === 'productType' && productTypeId) {
      whereCondition.productTypeId = productTypeId;
    } else {
      throw new BusinessException(ErrorCode.INVALID_INPUT, '参数错误');
    }

    // 获取商品数据
    const products = await this.prisma.product.findMany({
      where: whereCondition,
      include: {
        groupBuy: {
          where: {
            delete: 0,
            ...(startDate &&
              endDate && {
                groupBuyStartDate: {
                  gte: startDate,
                  lte: endDate,
                },
              }),
          },
          include: {
            order: {
              where: {
                status: {
                  in: [OrderStatus.PAID, OrderStatus.COMPLETED],
                },
                customer: {
                  customerAddressId: addressId,
                },
              },
              include: {
                customer: {
                  include: {
                    customerAddress: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // 收集客户信息
    const customerMap = new Map<string, CustomerBasicInfo>();
    for (const product of products) {
      for (const groupBuy of product.groupBuy) {
        for (const order of groupBuy.order) {
          if (!customerMap.has(order.customerId)) {
            customerMap.set(order.customerId, {
              customerId: order.customer.id,
              customerName: order.customer.name,
              customerAddressName: order.customer.customerAddress?.name,
              purchaseCount: 0,
            });
          }
        }
      }
    }

    // 统计每个客户的购买次数
    for (const product of products) {
      for (const groupBuy of product.groupBuy) {
        for (const order of groupBuy.order) {
          const customer = customerMap.get(order.customerId);
          if (customer && customer.purchaseCount !== undefined) {
            customer.purchaseCount += 1;
          }
        }
      }
    }

    return { customers: Array.from(customerMap.values()) };
  }
}
