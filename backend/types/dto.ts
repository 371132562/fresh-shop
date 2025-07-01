import {
  Supplier,
  ProductType,
  Product,
  CustomerAddress,
  Customer,
} from '@prisma/client';

export { Supplier, ProductType, Product, CustomerAddress, Customer };

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
