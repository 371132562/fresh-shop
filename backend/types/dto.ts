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

// 为 GlobalSetting 的 value 字段定义类型
export type GlobalSettingValue = {
  sensitive: boolean;
};

// 扩展 GlobalSetting 类型，明确 value 的类型
export type GlobalSettingWithTypedValue = Omit<GlobalSetting, 'value'> & {
  value: GlobalSettingValue;
};

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

export type SupplierPageParams = CommonPageParams & {
  name: string;
  phone: string;
  wechat: string;
};

export type ProductTypePageParams = CommonPageParams & {
  name: string;
};

export type ProductPageParams = CommonPageParams & {
  name: string;
  productTypeIds: ProductType['id'][];
};

export type CustomerAddressPageParams = CommonPageParams & {
  name: string;
};

export type CustomerPageParams = CommonPageParams & {
  name: string;
  phone: string;
  wechat: string;
  customerAddressIds: CustomerAddress['id'][];
};

export type GroupBuyPageParams = CommonPageParams & {
  name: string;
  startDate: Date | null;
  endDate: Date | null;
  supplierIds: Supplier['id'][];
  productIds: Product['id'][];
};

export type GroupBuyDetail = GroupBuy & {
  supplier: Supplier;
  product: Product;
  _count: {
    order: number;
  };
};

export type GroupBuyUnit = {
  id: string;
  unit: string;
  price: number;
  costPrice: number;
};

export type OrderPageParams = CommonPageParams & {
  customerIds: Customer['id'][];
  groupBuyIds: GroupBuy['id'][];
  status: OrderStatus | '';
};

export type OrderDetail = Order & {
  customer: Customer;
  groupBuy: GroupBuy;
};

export type AnalysisCountParams = {
  startDate: Date;
  endDate: Date;
};

export type AnalysisCountResult = {
  groupBuyCount: number; // 发起的团购数
  orderCount: number; // 发起的订单数
  totalPrice: number; // 总销售额
  totalProfit: number; // 总利润
};
