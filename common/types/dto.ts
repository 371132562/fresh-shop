import { Supplier } from 'fresh-shop-backend/types'

export type { Supplier }

export type PageParams = {
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
