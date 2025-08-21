import {
  Supplier,
  ProductType,
  Product,
  CustomerAddress,
  Customer,
  GroupBuy,
  OrderStatus,
  Order,
  GlobalSetting,
} from '@prisma/client';

export {
  Supplier,
  ProductType,
  Product,
  CustomerAddress,
  Customer,
  GroupBuy,
  OrderStatus,
  Order,
  GlobalSetting,
};

// ===================================================================
// 通用类型定义
// 包含分页、列表响应、文件操作等通用数据传输对象
// ===================================================================

/**
 * 通用排序方向枚举
 * 定义所有排序操作的升降序
 */
export type SortOrder = 'asc' | 'desc';

/**
 * 通用分页参数
 * 用于所有需要分页的查询接口
 */
export type CommonPageParams = {
  page: number; // 页码，从1开始
  pageSize: number; // 每页数量
};

/**
 * 通用分页响应结构
 * 用于包装所有分页查询的返回结果
 */
export type ListByPage<T> = {
  data: T; // 实际数据
  page: number; // 当前页码
  pageSize: number; // 每页数量
  totalCount: number; // 总记录数
  totalPages: number; // 总页数
};

/**
 * 删除图片请求参数
 * 用于删除供货商或团购相关的图片文件
 */
export type DeleteImageDto = {
  type: 'supplier' | 'groupBuy'; // 图片类型
  id: string; // 关联的记录ID
  filename: string; // 文件名
};

/**
 * 孤立图片扫描结果项
 */
export type OrphanImageItem = {
  filename: string; // 文件名
  inDisk: boolean; // 是否存在于物理磁盘
  inDB: boolean; // 是否存在于数据库 image 表
};

/**
 * 扫描孤立图片返回结果
 */
export type ScanOrphanImagesResult = {
  list: OrphanImageItem[];
};

/**
 * 批量删除孤立图片返回结果
 */
export type DeleteOrphanImagesResult = {
  deleted: string[]; // 实际删除的文件名
  skipped: string[]; // 因被引用或其他原因跳过的文件名
};

// ===================================================================
// 全局设置模块 (GlobalSetting)
// 包含系统全局配置相关的数据传输对象
// ===================================================================

/**
 * 全局设置值类型定义
 * 定义GlobalSetting表中value字段的具体结构
 */
export type GlobalSettingValue = {
  sensitive: boolean; // 是否为敏感信息
};

/**
 * 带类型化值的全局设置
 * 扩展原始GlobalSetting类型，明确value字段的类型
 */
export type GlobalSettingWithTypedValue = Omit<GlobalSetting, 'value'> & {
  value: GlobalSettingValue;
};

/**
 * 全局设置更新参数
 * 用于创建或更新全局设置项
 */
export type GlobalSettingUpsertParams = {
  key: string; // 设置项键名
  value: any; // 设置项值（支持任意类型）
};

// ===================================================================
// 供货商模块 (Supplier)
// 包含供货商管理相关的数据传输对象
// ===================================================================

/**
 * 供货商分页查询参数
 * 用于供货商列表的筛选和分页查询
 */
export type SupplierPageParams = CommonPageParams & {
  name: string; // 供货商名称（模糊搜索）
  phone: string; // 联系电话（模糊搜索）
  wechat: string; // 微信号（模糊搜索）
};

/**
 * 供货商列表项
 * 扩展基础供货商信息，包含统计数据
 */
export type SupplierListItem = Supplier & {
  groupBuyCount: number; // 该供货商发起的团购数量
};

/**
 * 供货商排行榜项（按订单数量）
 * 用于统计分析中的供货商排行
 */
export type SupplierRankByOrderCountItem = {
  id: string; // 供货商ID
  name: string; // 供货商名称
  orderCount: number; // 订单总数
};

/**
 * 供货商排行榜项（按总销售额）
 * 用于统计分析中的供货商排行
 */
export type SupplierRankByTotalSalesItem = {
  id: string; // 供货商ID
  name: string; // 供货商名称
  totalSales: number; // 总销售额
};

/**
 * 供货商排行榜项（按总利润）
 * 用于统计分析中的供货商排行
 */
export type SupplierRankByTotalProfitItem = {
  id: string; // 供货商ID
  name: string; // 供货商名称
  totalProfit: number; // 总利润
};

/**
 * 供货商排行榜结果集合
 * 包含供货商的各种排行榜数据
 */
export type SupplierRankResult = {
  supplierRankByOrderCount: SupplierRankByOrderCountItem[]; // 按订单数排行
  supplierRankByTotalSales: SupplierRankByTotalSalesItem[]; // 按销售额排行
  supplierRankByTotalProfit: SupplierRankByTotalProfitItem[]; // 按利润排行
};

// ===================================================================
// 商品类型模块 (ProductType)
// 包含商品分类管理相关的数据传输对象
// ===================================================================

/**
 * 商品类型分页查询参数
 * 用于商品类型列表的筛选和分页查询
 */
export type ProductTypePageParams = CommonPageParams & {
  name: string; // 商品类型名称（模糊搜索）
};

// ===================================================================
// 商品模块 (Product)
// 包含商品管理相关的数据传输对象
// ===================================================================

/**
 * 商品分页查询参数
 * 用于商品列表的筛选和分页查询
 */
export type ProductPageParams = CommonPageParams & {
  name: string; // 商品名称（模糊搜索）
  productTypeIds: ProductType['id'][]; // 商品类型ID数组（精确匹配）
};

// ===================================================================
// 客户地址模块 (CustomerAddress)
// 包含客户地址管理相关的数据传输对象
// ===================================================================

/**
 * 客户地址分页查询参数
 * 用于客户地址列表的筛选和分页查询
 */
export type CustomerAddressPageParams = CommonPageParams & {
  name: string; // 地址名称（模糊搜索）
};

// ===================================================================
// 客户模块 (Customer)
// 包含客户管理、消费分析相关的数据传输对象
// ===================================================================

/**
 * 客户排序字段枚举
 * 定义客户列表支持的排序字段
 */
export type CustomerSortField = 'createdAt' | 'orderCount' | 'orderTotalAmount';

/**
 * 客户分页查询参数
 * 用于客户列表的筛选、排序和分页查询
 */
export type CustomerPageParams = CommonPageParams & {
  name: string; // 客户姓名（模糊搜索）
  phone: string; // 联系电话（模糊搜索）
  wechat: string; // 微信号（模糊搜索）
  customerAddressIds: CustomerAddress['id'][]; // 客户地址ID数组（精确匹配）
  sortField?: CustomerSortField; // 排序字段（可选）
  sortOrder?: SortOrder; // 排序方向（可选）
};

/**
 * 客户列表项
 * 扩展基础客户信息，包含订单统计和地址信息
 */
export type CustomerListItem = Customer & {
  orderCount: number; // 订单数量
  orderTotalAmount: number; // 订单总额
  customerAddressName: string; // 客户地址名称
};

/**
 * 客户消费详情
 * 用于展示客户的详细消费分析数据
 */
export type CustomerConsumptionDetailDto = {
  customerName: string; // 客户名称
  orderCount: number; // 订单数量
  totalAmount: number; // 订单总额
  averagePricePerOrder: number; // 每单平均价格
  topProducts: {
    productId: string; // 商品ID
    productName: string; // 商品名称
    count: number; // 购买次数
    isLatestConsumption: boolean; // 是否为最近参团的商品
    groupBuys: {
      groupBuyName: string; // 团购名称
      unitName: string; // 规格名称
      count: number; // 购买数量
      totalAmount: number; // 该团购规格的总消费金额
      latestGroupBuyStartDate: Date; // 最近一次团购发起时间
    }[]; // 该商品下的团购单列表
  }[]; // 购买最多的商品及其团购详情
};

/**
 * 客户排行榜项（按订单数量）
 * 用于统计分析中的客户排行
 */
export type CustomerRankByOrderCountItem = {
  id: string; // 客户ID
  name: string; // 客户名称
  orderCount: number; // 订单总数
};

/**
 * 客户排行榜项（按总消费金额）
 * 用于统计分析中的客户排行
 */
export type CustomerRankByTotalAmountItem = {
  id: string; // 客户ID
  name: string; // 客户名称
  totalAmount: number; // 总消费金额
};

/**
 * 客户排行榜项（按平均订单金额）
 * 用于统计分析中的客户排行
 */
export type CustomerRankByAverageOrderAmountItem = {
  id: string; // 客户ID
  name: string; // 客户名称
  averageOrderAmount: number; // 平均订单金额
};

/**
 * 客户排行榜结果集合
 * 包含客户的各种排行榜数据
 */
export type CustomerRankResult = {
  customerRankByOrderCount: CustomerRankByOrderCountItem[]; // 按订单数排行
  customerRankByTotalAmount: CustomerRankByTotalAmountItem[]; // 按消费额排行
  customerRankByAverageOrderAmount: CustomerRankByAverageOrderAmountItem[]; // 按平均订单额排行
};

/**
 * 客户购买频次分布
 * 用于统计客户的购买次数分布情况
 */
export type CustomerPurchaseFrequency = {
  frequency: number; // 购买次数（如1, 2, 3等）
  count: number; // 该频次的客户数量
};

// ===================================================================
// 团购模块 (GroupBuy)
// 包含团购管理、统计分析相关的数据传输对象
// ===================================================================

/**
 * 团购分页查询参数
 * 用于团购列表的筛选和分页查询
 */
export type GroupBuyPageParams = CommonPageParams & {
  name: string; // 团购名称（模糊搜索）
  startDate: Date | null; // 开始时间筛选
  endDate: Date | null; // 结束时间筛选
  supplierIds: Supplier['id'][]; // 供货商ID数组（精确匹配）
  productIds: Product['id'][]; // 商品ID数组（精确匹配）
  orderStatuses: OrderStatus[]; // 订单状态数组（精确匹配）
};

/**
 * 团购订单统计
 * 用于统计团购下各状态的订单数量
 */
export type GroupBuyOrderStats = {
  orderCount: number; // 总订单数
  NOTPAID: number; // 未支付订单数
  PAID: number; // 已支付订单数
  COMPLETED: number; // 已完成订单数
  REFUNDED: number; // 已退款订单数
};

/**
 * 团购列表项
 * 扩展基础团购信息，包含关联的供货商、商品和订单统计
 */
export type GroupBuyListItem = GroupBuy & {
  supplier: Supplier; // 供货商信息
  product: Product; // 商品信息
  orderStats: GroupBuyOrderStats; // 订单统计
};

/**
 * 团购详情
 * 包含团购的完整信息和相关订单列表
 */
export type GroupBuyDetail = GroupBuy & {
  supplier: Supplier; // 供货商信息
  product: Product; // 商品信息
  order: (Order & {
    customer: { name: string; phone: string; wechat: string }; // 客户基本信息
  })[]; // 订单列表
};

/**
 * 团购规格单元
 * 定义团购商品的不同规格和价格
 */
export type GroupBuyUnit = {
  id: string; // 规格ID
  unit: string; // 规格名称
  price: number; // 销售价格
  costPrice: number; // 成本价格
};

/**
 * 全部团购项
 * 用于下拉选择等场景的简化团购信息
 */
export type AllGroupBuyItem = {
  id: string; // 团购ID
  name: string; // 团购名称
  groupBuyStartDate: Date; // 团购开始时间
  units: GroupBuyUnit[]; // 规格列表
};

/**
 * 团购排行榜项（按订单数量）
 * 用于统计分析中的团购排行
 */
export type GroupBuyRankByOrderCountItem = {
  id: string; // 团购ID
  name: string; // 团购名称
  orderCount: number; // 订单总数
  groupBuyStartDate: Date; // 团购开始时间
};

/**
 * 团购排行榜项（按总销售额）
 * 用于统计分析中的团购排行
 */
export type GroupBuyRankByTotalSalesItem = {
  id: string; // 团购ID
  name: string; // 团购名称
  totalSales: number; // 总销售额
  groupBuyStartDate: Date; // 团购开始时间
};

/**
 * 团购排行榜项（按总利润）
 * 用于统计分析中的团购排行
 */
export type GroupBuyRankByTotalProfitItem = {
  id: string; // 团购ID
  name: string; // 团购名称
  totalProfit: number; // 总利润
  groupBuyStartDate: Date; // 团购开始时间
};

/**
 * 团购排行榜结果集合
 * 包含团购的各种排行榜数据
 */
export type GroupBuyRankResult = {
  groupBuyRankByOrderCount: GroupBuyRankByOrderCountItem[]; // 按订单数排行
  groupBuyRankByTotalSales: GroupBuyRankByTotalSalesItem[]; // 按销售额排行
  groupBuyRankByTotalProfit: GroupBuyRankByTotalProfitItem[]; // 按利润排行
};

/**
 * 团购合并概况排序字段枚举
 * 定义团购合并概况列表支持的排序字段
 */
export type MergedGroupBuyOverviewSortField =
  | 'totalRevenue'
  | 'totalProfit'
  | 'profitMargin'
  | 'uniqueCustomerCount'
  | 'totalOrderCount';

/**
 * 团购合并概况详情查询参数
 * 用于获取特定团购名称的详细统计数据
 */
export type MergedGroupBuyOverviewDetailParams = {
  groupBuyName: string; // 团购名称
  supplierId: string; // 供货商ID
  startDate?: Date; // 统计开始时间（可选，支持无时间参数查询全部数据）
  endDate?: Date; // 统计结束时间（可选，支持无时间参数查询全部数据）
};

// ===================================================================
// 团购概况分析模块
// 包含团购合并统计、概况分析相关的数据传输对象
// ===================================================================

/**
 * 团购合并概况查询参数
 * 用于按团购名称合并统计的概况分析查询
 */
export type MergedGroupBuyOverviewParams = {
  startDate?: Date; // 统计开始时间（可选，支持无时间参数查询全部数据）
  endDate?: Date; // 统计结束时间（可选，支持无时间参数查询全部数据）
  page?: number; // 页码（可选）
  pageSize?: number; // 每页数量（可选）
  // 搜索参数
  groupBuyName?: string; // 按团购名称搜索（模糊匹配）
  supplierIds?: Supplier['id'][]; // 按供应商ID数组搜索（精确匹配）
  // 排序参数
  sortField?: MergedGroupBuyOverviewSortField; // 排序字段
  sortOrder?: SortOrder; // 排序方向
};

/**
 * 团购合并概况列表项
 * 用于展示按团购名称合并后的统计数据
 */
export type MergedGroupBuyOverviewListItem = {
  groupBuyName: string; // 团购名称
  supplierId: string; // 供货商ID
  supplierName: string; // 供货商名称
  totalRevenue: number; // 总销售额
  totalProfit: number; // 总利润
  totalOrderCount: number; // 总订单量
  uniqueCustomerCount: number; // 总参与客户数（去重）
};

/**
 * 地域销售统计项
 * 用于分析不同地区的销售情况
 */
export type RegionalSalesItem = {
  addressId: string; // 地址ID
  addressName: string; // 地址名称
  customerCount: number; // 购买客户数
};

/**
 * 团购发起历史记录
 * 用于展示同一名称团购的多次发起情况
 */
export type GroupBuyLaunchHistory = {
  groupBuyId: string; // 团购单ID
  launchDate: Date; // 发起时间
  orderCount: number; // 该次发起的订单数量
  revenue: number; // 该次发起的销售额
  profit: number; // 该次发起的利润
  groupBuyName: string; // 团购名称
  customerCount: number; // 该次发起的客户数
  refundedOrderCount: number; // 该次发起的退款订单数
};

/**
 * 团购合并概况详情
 * 包含特定团购名称的详细统计分析数据
 */
export type MergedGroupBuyOverviewDetail = {
  groupBuyName: string; // 团购名称
  supplierId: string; // 供货商ID
  supplierName: string; // 供货商名称
  startDate?: Date; // 统计开始时间（可选）
  endDate?: Date; // 统计结束时间（可选）
  totalRevenue: number; // 总销售额
  totalProfit: number; // 总利润
  totalProfitMargin: number; // 总利润率
  totalOrderCount: number; // 总订单量
  uniqueCustomerCount: number; // 总参与客户数（去重）
  averageCustomerOrderValue: number; // 平均客单价
  totalGroupBuyCount: number; // 该名称团购单总发起次数
  customerPurchaseFrequency: CustomerPurchaseFrequency[]; // 客户购买次数分布
  multiPurchaseCustomerCount: number; // 多次购买客户总数
  multiPurchaseCustomerRatio: number; // 多次购买客户比例
  repeatCustomerCount: number; // 复购客户数
  repeatCustomerRatio: number; // 复购客户比例
  regionalSales: RegionalSalesItem[]; // 地域销售分析
  groupBuyLaunchHistory: GroupBuyLaunchHistory[]; // 团购发起历史记录
};

/**
 * 获取特定购买频次客户列表的请求参数
 * 用于查询在指定团购和时间范围内具有特定购买频次的客户
 */
export type MergedGroupBuyFrequencyCustomersParams = {
  groupBuyName: string; // 团购名称
  supplierId: string; // 供货商ID
  frequency: number; // 购买频次
  startDate?: Date; // 统计开始时间（可选）
  endDate?: Date; // 统计结束时间（可选）
};

/**
 * 获取特定区域客户列表的请求参数
 * 用于查询在指定团购和时间范围内特定区域的客户
 */
export type MergedGroupBuyRegionalCustomersParams = {
  groupBuyName: string; // 团购名称
  supplierId: string; // 供货商ID
  addressId: string; // 地址ID
  startDate?: Date; // 统计开始时间（可选）
  endDate?: Date; // 统计结束时间（可选）
};

/**
 * 客户基本信息
 * 用于客户列表展示
 */
export type CustomerBasicInfo = {
  customerId: string; // 客户ID
  customerName: string; // 客户名称
};

/**
 * 特定购买频次客户列表结果
 */
export type MergedGroupBuyFrequencyCustomersResult = {
  groupBuyName: string; // 团购名称
  frequency: number; // 购买频次
  customers: CustomerBasicInfo[]; // 客户列表
};

/**
 * 特定区域客户列表结果
 */
export type MergedGroupBuyRegionalCustomersResult = {
  groupBuyName: string; // 团购名称
  addressId: string; // 地址ID
  addressName: string; // 地址名称
  customers: CustomerBasicInfo[]; // 客户列表
};

/**
 * 团购合并概况分页结果
 * 包含分页信息的团购概况列表响应
 */
export type MergedGroupBuyOverviewResult = {
  list: MergedGroupBuyOverviewListItem[]; // 概况列表
  total: number; // 总记录数
  page: number; // 当前页码
  pageSize: number; // 每页数量
};

// ===================================================================
// 订单模块 (Order)
// 包含订单管理相关的数据传输对象
// ===================================================================

/**
 * 订单分页查询参数
 * 用于订单列表的筛选和分页查询
 */
export type OrderPageParams = CommonPageParams & {
  customerIds: Customer['id'][]; // 客户ID数组（精确匹配）
  groupBuyIds: GroupBuy['id'][]; // 团购ID数组（精确匹配）
  statuses: OrderStatus[]; // 订单状态数组（精确匹配）
};

/**
 * 订单详情
 * 扩展基础订单信息，包含关联的客户和团购信息
 */
export type OrderDetail = Order & {
  customer: Customer; // 客户完整信息
  groupBuy: {
    id: string; // 团购ID
    name: string; // 团购名称
    groupBuyStartDate: Date; // 团购发起时间
    units: GroupBuyUnit[]; // 团购规格列表
  }; // 团购基本信息
};

/**
 * 订单统计数据
 * 包含待付款和已付款订单的数量及详细列表
 */

export type OrderStatsItem = Order & {
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  groupBuy: {
    id: string;
    name: string;
    groupBuyStartDate: Date;
  };
};

export type OrderStatsResult = {
  notPaidCount: number; // 待付款订单数量
  paidCount: number; // 已付款订单数量
  notPaidOrders: OrderStatsItem[]; // 待付款订单详细列表
  paidOrders: OrderStatsItem[]; // 已付款订单详细列表
};

// ===================================================================
// 统计分析模块 (Analysis)
// 包含数据统计、趋势分析相关的数据传输对象
// ===================================================================

/**
 * 统计分析查询参数
 * 用于指定统计分析的时间范围
 */
export type AnalysisCountParams = {
  startDate: Date; // 统计开始时间
  endDate: Date; // 统计结束时间
};

/**
 * 统计分析结果
 * 包含各种业务指标的统计数据和趋势图表数据
 */
export type AnalysisCountResult = {
  // 基础统计指标
  groupBuyCount: number; // 发起的团购数
  orderCount: number; // 发起的订单数
  totalPrice: number; // 总销售额
  totalProfit: number; // 总利润

  // 趋势数据（用于图表展示）
  groupBuyTrend: {
    date: Date; // 日期
    count: number; // 团购数量
  }[]; // 团购发起趋势

  orderTrend: {
    date: Date; // 日期
    count: number; // 订单数量
  }[]; // 订单创建趋势

  priceTrend: {
    date: Date; // 日期
    count: number; // 销售额
  }[]; // 销售额趋势

  profitTrend: {
    date: Date; // 日期
    count: number; // 利润
  }[]; // 利润趋势
};

// ===================================================================
// 供货商概况分析模块
// 包含供货商维度统计、概况分析相关的数据传输对象
//
// 功能说明：
// - 提供供货商维度的数据统计和分析功能
// - 支持供货商概况列表和详情数据查询
// - 包含多维度分析：销售、客户、产品、地域、时间等
// - 支持搜索、排序、分页等查询功能
// ===================================================================

/**
 * 供货商概况排序字段
 * 定义供货商概况列表支持的排序字段
 *
 * 支持的排序维度：
 * - totalRevenue: 按总销售额排序
 * - totalProfit: 按总利润排序
 * - totalOrderCount: 按总订单量排序
 * - uniqueCustomerCount: 按参与客户数排序
 * - totalGroupBuyCount: 按团购单数排序
 * - averageProfitMargin: 按平均利润率排序
 */
export type SupplierOverviewSortField =
  | 'totalRevenue' // 总销售额
  | 'totalProfit' // 总利润
  | 'totalOrderCount' // 总订单量
  | 'uniqueCustomerCount' // 参与客户数
  | 'totalGroupBuyCount' // 团购单数
  | 'averageProfitMargin'; // 平均利润率

/**
 * 供货商概况查询参数
 * 用于供货商维度的概况分析查询
 *
 * 查询功能：
 * - 支持时间范围过滤（可选）
 * - 支持分页查询
 * - 支持按供货商名称搜索
 * - 支持多字段排序
 *
 * 使用场景：
 * - 供货商概况列表页面
 * - 供货商绩效排行
 * - 供货商搜索和筛选
 */
export type SupplierOverviewParams = {
  // 时间范围参数（可选）
  startDate?: Date; // 统计开始时间，不提供则查询全部历史数据
  endDate?: Date; // 统计结束时间，不提供则查询全部历史数据

  // 分页参数（可选）
  page?: number; // 页码，从1开始，默认为1
  pageSize?: number; // 每页数量，默认为10

  // 搜索参数
  supplierName?: string; // 按供货商名称搜索，支持模糊匹配

  // 排序参数
  sortField?: SupplierOverviewSortField; // 排序字段，默认为totalRevenue
  sortOrder?: SortOrder; // 排序方向，默认为desc
};

/**
 * 供货商概况列表项
 * 用于展示供货商维度的统计数据
 *
 * 数据说明：
 * - 包含供货商的基本信息和核心业绩指标
 * - 所有数值均为指定时间范围内的累计统计
 * - 客户数为去重后的唯一客户数量
 *
 * 使用场景：
 * - 供货商概况列表展示
 * - 供货商绩效排行
 * - 供货商筛选和比较
 */
export type SupplierOverviewListItem = {
  // 基本信息
  supplierId: string; // 供货商唯一标识
  supplierName: string; // 供货商名称

  // 核心业绩指标
  totalRevenue: number; // 总销售额（元）
  totalProfit: number; // 总利润（元）
  totalOrderCount: number; // 总订单量（单）
  uniqueCustomerCount: number; // 参与客户数（人，去重）
  totalGroupBuyCount: number; // 团购单数（个）
  averageProfitMargin: number; // 平均利润率（%）
};

/**
 * 供货商概况分页结果
 * 包含分页信息的供货商概况列表响应
 */
export type SupplierOverviewResult = {
  list: SupplierOverviewListItem[]; // 概况列表
  total: number; // 总记录数
  page: number; // 当前页码
  pageSize: number; // 每页数量
};

/**
 * 热销产品统计项
 * 用于分析供货商的热销产品排行
 *
 * 数据说明：
 * - 按销售额排序的热销产品列表
 * - 包含产品的销售表现和客户覆盖情况
 * - 用于识别供货商的核心产品和市场表现
 *
 * 使用场景：
 * - 供货商详情页面的热销产品排行
 * - 产品表现分析和优化建议
 * - 供货商产品策略制定
 */
export type TopProductItem = {
  // 产品基本信息
  productId: string; // 产品唯一标识
  productName: string; // 产品名称

  // 销售表现指标
  totalRevenue: number; // 总销售额（元）
  totalProfit: number; // 总利润（元）
  orderCount: number; // 订单数量（单）
  groupBuyCount: number; // 团购单数量（个）
};

/**
 * 产品分类统计项
 * 用于分析供货商不同产品分类的表现
 *
 * 数据说明：
 * - 按产品分类维度的销售统计
 * - 包含分类的销售表现和产品覆盖情况
 * - 用于分析供货商的产品结构优势
 *
 * 使用场景：
 * - 供货商详情页面的产品分类分析
 * - 产品结构优化建议
 * - 供货商产品策略分析
 */
export type ProductCategoryStat = {
  // 分类基本信息
  categoryId: string; // 分类唯一标识
  categoryName: string; // 分类名称

  // 销售表现指标
  totalRevenue: number; // 总销售额（元）
  totalProfit: number; // 总利润（元）
  orderCount: number; // 订单数量（单）
  productCount: number; // 产品数量（个）
  groupBuyCount: number; // 团购单数量（个）
};

/**
 * 供货商团购历史记录
 * 用于展示供货商的团购发起历史
 */
export type SupplierGroupBuyHistory = {
  groupBuyId: string; // 团购单ID
  groupBuyName: string; // 团购名称
  launchDate: Date; // 发起时间
  orderCount: number; // 该次团购的订单数量
  revenue: number; // 该次团购的销售额
  profit: number; // 该次团购的利润
  customerCount: number; // 该次团购的客户数
  refundedOrderCount: number; // 该次团购的退款订单数
};

/**
 * 供货商概况详情查询参数
 * 用于获取特定供货商的详细统计数据
 */
export type SupplierOverviewDetailParams = {
  supplierId: string; // 供货商ID
  startDate?: Date; // 统计开始时间（可选，支持无时间参数查询全部数据）
  endDate?: Date; // 统计结束时间（可选，支持无时间参数查询全部数据）
};

/**
 * 供货商概况详情
 * 包含特定供货商的详细统计分析数据
 */
export type SupplierOverviewDetail = {
  supplierId: string; // 供货商ID
  supplierName: string; // 供货商名称
  startDate?: Date; // 统计开始时间（可选）
  endDate?: Date; // 统计结束时间（可选）

  // 核心业绩指标
  totalRevenue: number; // 总销售额
  totalProfit: number; // 总利润
  averageProfitMargin: number; // 平均利润率
  totalOrderCount: number; // 总订单量

  // 客户分析
  uniqueCustomerCount: number; // 总参与客户数
  averageCustomerOrderValue: number; // 平均客单价
  repeatCustomerCount: number; // 复购客户数
  repeatCustomerRatio: number; // 复购客户比例
  customerPurchaseFrequency: CustomerPurchaseFrequency[]; // 客户购买次数分布
  multiPurchaseCustomerCount: number; // 多次购买客户数
  multiPurchaseCustomerRatio: number; // 多次购买客户占比

  // 团购分析
  totalGroupBuyCount: number; // 发起的团购单总数
  averageGroupBuyRevenue: number; // 平均每次团购销售额

  // 产品分析
  topProducts: TopProductItem[]; // 热销产品排行
  productCategoryStats: ProductCategoryStat[]; // 产品分类统计

  // 地域分析
  regionalSales: RegionalSalesItem[]; // 地域销售分布

  // 团购历史
  groupBuyHistory: GroupBuyLaunchHistory[]; // 团购发起历史
};

/**
 * 获取供货商特定购买频次客户列表的请求参数
 * 用于查询在指定供货商和时间范围内具有特定购买频次的客户
 */
export type SupplierFrequencyCustomersParams = {
  supplierId: string; // 供货商ID
  frequency: number; // 购买频次
  startDate?: Date; // 统计开始时间（可选）
  endDate?: Date; // 统计结束时间（可选）
};

/**
 * 供货商特定购买频次客户列表响应
 * 包含指定购买频次的客户基本信息列表
 */
export type SupplierFrequencyCustomersResult = {
  customers: CustomerBasicInfo[]; // 客户基本信息列表
};

/**
 * 获取供货商特定区域客户列表的请求参数
 * 用于查询在指定供货商和时间范围内特定地址的客户
 */
export type SupplierRegionalCustomersParams = {
  supplierId: string; // 供货商ID
  addressId: string; // 地址ID
  startDate?: Date; // 统计开始时间（可选）
  endDate?: Date; // 统计结束时间（可选）
};

/**
 * 供货商特定区域客户列表响应
 * 包含指定地址的客户基本信息列表
 */
export type SupplierRegionalCustomersResult = {
  customers: CustomerBasicInfo[]; // 客户基本信息列表
};
