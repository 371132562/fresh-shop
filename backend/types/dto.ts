import { Supplier, ProductType, Product } from '@prisma/client';

export { Supplier, ProductType, Product };

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
