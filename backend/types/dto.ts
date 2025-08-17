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
 * 客户排序方向枚举
 * 定义排序的升降序
 */
export type CustomerSortOrder = 'asc' | 'desc';

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
  sortOrder?: CustomerSortOrder; // 排序方向（可选）
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
 * 合并团购排行榜项（按订单数量）
 * 用于按团购名称合并统计的排行榜
 */
export type MergedGroupBuyRankByOrderCountItem = {
  name: string; // 团购名称
  orderCount: number; // 订单总数
};

/**
 * 合并团购排行榜项（按总销售额）
 * 用于按团购名称合并统计的排行榜
 */
export type MergedGroupBuyRankByTotalSalesItem = {
  name: string; // 团购名称
  totalSales: number; // 总销售额
};

/**
 * 合并团购排行榜项（按总利润）
 * 用于按团购名称合并统计的排行榜
 */
export type MergedGroupBuyRankByTotalProfitItem = {
  name: string; // 团购名称
  totalProfit: number; // 总利润
};

/**
 * 合并团购排行榜结果集合
 * 包含按名称合并的团购各种排行榜数据
 */
export type MergedGroupBuyRankResult = {
  mergedGroupBuyRankByOrderCount: MergedGroupBuyRankByOrderCountItem[]; // 按订单数排行
  mergedGroupBuyRankByTotalSales: MergedGroupBuyRankByTotalSalesItem[]; // 按销售额排行
  mergedGroupBuyRankByTotalProfit: MergedGroupBuyRankByTotalProfitItem[]; // 按利润排行
};

/**
 * 合并团购客户排行项
 * 用于统计特定团购名称下的客户购买排行
 */
export type MergedGroupBuyCustomerRankItem = {
  customerId: string; // 客户ID
  customerName: string; // 客户名称
  orderCount: number; // 订单数量
};

/**
 * 合并团购客户排行查询参数
 * 用于查询特定团购名称和时间范围内的客户排行
 */
export type MergedGroupBuyCustomerRankParams = {
  groupBuyName: string; // 团购名称
  startDate: Date; // 开始时间
  endDate: Date; // 结束时间
};

/**
 * 合并团购客户排行结果
 * 包含团购名称和对应的客户排行数据
 */
export type MergedGroupBuyCustomerRankResult = {
  groupBuyName: string; // 团购名称
  customerRank: MergedGroupBuyCustomerRankItem[]; // 客户排行列表
};

/**
 * 团购合并概况详情查询参数
 * 用于查询特定团购名称的详细统计信息
 */
export type MergedGroupBuyOverviewDetailParams = {
  groupBuyName: string; // 团购名称
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
  sortField?:
    | 'totalRevenue'
    | 'totalProfit'
    | 'uniqueCustomerCount'
    | 'totalOrderCount'; // 排序字段
  sortOrder?: 'asc' | 'desc'; // 排序方向
};

/**
 * 团购合并概况列表项
 * 用于展示按团购名称合并后的统计数据
 */
export type MergedGroupBuyOverviewListItem = {
  groupBuyName: string; // 团购名称
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
 * 团购合并概况详情
 * 包含特定团购名称的详细统计分析数据
 */
export type MergedGroupBuyOverviewDetail = {
  groupBuyName: string; // 团购名称
  supplierNames: string[]; // 供货商名称列表（可能有多个供货商）
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
  regionalSales: RegionalSalesItem[]; // 地域销售分析
};

/**
 * 获取特定购买频次客户列表的请求参数
 * 用于查询在指定团购和时间范围内具有特定购买频次的客户
 */
export type MergedGroupBuyFrequencyCustomersParams = {
  groupBuyName: string; // 团购名称
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
  status: OrderStatus | ''; // 订单状态（精确匹配，空字符串表示全部）
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
    units: GroupBuyUnit[]; // 团购规格列表
  }; // 团购基本信息
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
