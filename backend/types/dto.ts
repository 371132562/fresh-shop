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
  customerAddressName: string;
};

export type CustomerPageParams = CommonPageParams & {
  name: string;
  phone: string;
  wechat: string;
  customerAddressIds: CustomerAddress['id'][];
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

export type SupplierRankByGroupBuyCountItem = {
  id: string;
  name: string;
  groupBuyCount: number;
};

export type AnalysisRankResult = {
  groupBuyRankByOrderCount: GroupBuyRankByOrderCountItem[];
  groupBuyRankByTotalSales: GroupBuyRankByTotalSalesItem[];
  groupBuyRankByTotalProfit: GroupBuyRankByTotalProfitItem[];
  supplierRankByGroupBuyCount: SupplierRankByGroupBuyCountItem[];
};
