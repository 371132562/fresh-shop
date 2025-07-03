import {
  Supplier,
  ProductType,
  Product,
  CustomerAddress,
  Customer,
  GroupBuy,
  OrderStatus,
  Order,
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

export const OrderStatusMap: Record<OrderStatus, string> = {
  [OrderStatus.COMPLETED]: '正常',
  [OrderStatus.REFUNDED]: '已退款',
};

// 你也可以导出一个数组，更方便用于 select options
export const OrderStatusOptions = Object.entries(OrderStatusMap).map(
  ([value, label]) => ({
    value: value as OrderStatus, // 类型断言确保 value 是 OrderStatus 类型
    label: label,
  }),
);
