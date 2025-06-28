import { Supplier } from 'fresh-shop-backend/types'

export type { Supplier }

export type PageParams = {
  page: number
  pageSize: number
  name: string
  phone: string
  wechat: string
}

export type ListByPage<T> = {
  data: T
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
}
