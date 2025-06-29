export type CommonPageParams = {
  page: number
  pageSize: number
}

export type ListByPage<T> = {
  data: T
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}

export type SupplierPageParams = CommonPageParams & {
  name: string
  phone: string
  wechat: string
}

export type ProductTypePageParams = CommonPageParams & {
  name: string
}
