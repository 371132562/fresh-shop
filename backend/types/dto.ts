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

// =================================
// 通用类型
// =================================

export type CommonPageParams = {
  page: number;
  pageSize: number;
};

export type ListByPage<T> = {
  data: T;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type DeleteImageDto = {
  type: 'supplier' | 'groupBuy';
  id: string;
  filename: string;
};

// =================================
// 全局设置 (GlobalSetting)
// =================================

// 为 GlobalSetting 的 value 字段定义类型
export type GlobalSettingValue = {
  sensitive: boolean;
};

// 扩展 GlobalSetting 类型，明确 value 的类型
export type GlobalSettingWithTypedValue = Omit<GlobalSetting, 'value'> & {
  value: GlobalSettingValue;
};

export type GlobalSettingUpsertParams = {
  key: string;
  value: any;
};

// =================================
// 供货商 (Supplier)
// =================================

export type SupplierPageParams = CommonPageParams & {
  name: string;
  phone: string;
  wechat: string;
};

export type SupplierListItem = Supplier & {
  groupBuyCount: number;
};

// =================================
// 商品类型 (ProductType)
// =================================

export type ProductTypePageParams = CommonPageParams & {
  name: string;
};

// =================================
// 商品 (Product)
// =================================

export type ProductPageParams = CommonPageParams & {
  name: string;
  productTypeIds: ProductType['id'][];
};

// =================================
// 客户地址 (CustomerAddress)
// =================================

export type CustomerAddressPageParams = CommonPageParams & {
  name: string;
};

// =================================
// 客户 (Customer)
// =================================

export type CustomerListItem = Customer & {
  orderCount: number;
  orderTotalAmount: number; // 订单总额
  customerAddressName: string;
};

// 客户排序类型定义
export type CustomerSortField = 'createdAt' | 'orderCount' | 'orderTotalAmount';
export type CustomerSortOrder = 'asc' | 'desc';

export type CustomerPageParams = CommonPageParams & {
  name: string;
  phone: string;
  wechat: string;
  customerAddressIds: CustomerAddress['id'][];
  sortField?: CustomerSortField; // 排序字段
  sortOrder?: CustomerSortOrder; // 排序方向
};

// 客户消费详情 DTO
export type CustomerConsumptionDetailDto = {
  customerName: string; // 客户名称
  orderCount: number; // 订单数量
  totalAmount: number; // 订单总额
  averagePricePerOrder: number; // 每单平均价格
  topProducts: {
    productId: string;
    productName: string;
    count: number;
    groupBuys: {
      groupBuyName: string;
      unitName: string;
      count: number;
      totalAmount: number; // 该团购规格的总消费金额
    }[]; // 该商品下的团购单列表
  }[]; // 购买最多的商品及其团购详情
  topGroupBuys: {
    groupBuyName: string;
    unitName: string; // 新增：团购规格名称
    count: number;
  }[]; // 参与最多的团购（保留兼容性）
};

// =================================
// 团购 (GroupBuy)
// =================================

export type GroupBuyPageParams = CommonPageParams & {
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  supplierIds: Supplier['id'][];
  productIds: Product['id'][];
};

export type GroupBuyOrderStats = {
  orderCount: number;
  NOTPAID: number;
  PAID: number;
  COMPLETED: number;
  REFUNDED: number;
};

export type GroupBuyListItem = GroupBuy & {
  supplier: Supplier;
  product: Product;
  orderStats: GroupBuyOrderStats;
};

export type GroupBuyDetail = GroupBuy & {
  supplier: Supplier;
  product: Product;
  order: (Order & {
    customer: { name: string; phone: string; wechat: string };
  })[];
};

export type GroupBuyUnit = {
  id: string;
  unit: string;
  price: number;
  costPrice: number;
};

export type AllGroupBuyItem = {
  id: string;
  name: string;
  groupBuyStartDate: Date;
  units: GroupBuyUnit[];
};

// =================================
// 订单 (Order)
// =================================

export type OrderPageParams = CommonPageParams & {
  customerIds: Customer['id'][];
  groupBuyIds: GroupBuy['id'][];
  status: OrderStatus | '';
};

export type OrderDetail = Order & {
  customer: Customer;
  groupBuy: {
    id: string;
    name: string;
    units: GroupBuyUnit[];
  };
};

// =================================
// 统计分析 (Analysis)
// =================================

export type AnalysisCountParams = {
  startDate: Date;
  endDate: Date;
};

export type AnalysisCountResult = {
  groupBuyCount: number; // 发起的团购数
  orderCount: number; // 发起的订单数
  totalPrice: number; // 总销售额
  totalProfit: number; // 总利润
  groupBuyTrend: {
    date: Date;
    count: number;
  }[];
  orderTrend: {
    date: Date;
    count: number;
  }[];
  priceTrend: {
    date: Date;
    count: number;
  }[];
  profitTrend: {
    date: Date;
    count: number;
  }[];
};

export type GroupBuyRankByOrderCountItem = {
  id: string;
  name: string;
  orderCount: number;
  groupBuyStartDate: Date;
};

export type GroupBuyRankByTotalSalesItem = {
  id: string;
  name: string;
  totalSales: number;
  groupBuyStartDate: Date;
};

export type GroupBuyRankByTotalProfitItem = {
  id: string;
  name: string;
  totalProfit: number;
  groupBuyStartDate: Date;
};

export type SupplierRankByOrderCountItem = {
  id: string;
  name: string;
  orderCount: number;
};

export type SupplierRankByTotalSalesItem = {
  id: string;
  name: string;
  totalSales: number;
};

export type SupplierRankByTotalProfitItem = {
  id: string;
  name: string;
  totalProfit: number;
};

export type MergedGroupBuyRankByOrderCountItem = {
  name: string;
  orderCount: number;
};

export type MergedGroupBuyRankByTotalSalesItem = {
  name: string;
  totalSales: number;
};

export type MergedGroupBuyRankByTotalProfitItem = {
  name: string;
  totalProfit: number;
};

export type CustomerRankByOrderCountItem = {
  id: string;
  name: string;
  orderCount: number;
};

export type CustomerRankByTotalAmountItem = {
  id: string;
  name: string;
  totalAmount: number;
};

export type CustomerRankByAverageOrderAmountItem = {
  id: string;
  name: string;
  averageOrderAmount: number;
};

// 分离的排行榜返回类型
export type GroupBuyRankResult = {
  groupBuyRankByOrderCount: GroupBuyRankByOrderCountItem[];
  groupBuyRankByTotalSales: GroupBuyRankByTotalSalesItem[];
  groupBuyRankByTotalProfit: GroupBuyRankByTotalProfitItem[];
};

export type MergedGroupBuyRankResult = {
  mergedGroupBuyRankByOrderCount: MergedGroupBuyRankByOrderCountItem[];
  mergedGroupBuyRankByTotalSales: MergedGroupBuyRankByTotalSalesItem[];
  mergedGroupBuyRankByTotalProfit: MergedGroupBuyRankByTotalProfitItem[];
};

export type CustomerRankResult = {
  customerRankByOrderCount: CustomerRankByOrderCountItem[];
  customerRankByTotalAmount: CustomerRankByTotalAmountItem[];
  customerRankByAverageOrderAmount: CustomerRankByAverageOrderAmountItem[];
};

export type SupplierRankResult = {
  supplierRankByOrderCount: SupplierRankByOrderCountItem[];
  supplierRankByTotalSales: SupplierRankByTotalSalesItem[];
  supplierRankByTotalProfit: SupplierRankByTotalProfitItem[];
};

// 合并团购单客户排行相关类型
export type MergedGroupBuyCustomerRankItem = {
  customerId: string;
  customerName: string;
  orderCount: number;
};

export type MergedGroupBuyCustomerRankParams = {
  groupBuyName: string;
  startDate: Date;
  endDate: Date;
};

export type MergedGroupBuyCustomerRankResult = {
  groupBuyName: string;
  customerRank: MergedGroupBuyCustomerRankItem[];
};
