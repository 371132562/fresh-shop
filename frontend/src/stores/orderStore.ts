import { ListByPage, Order, OrderDetail, OrderPageParams } from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  orderCreateApi,
  orderDeleteApi,
  orderDetailApi,
  orderListAllApi,
  orderListApi,
  orderRefundApi,
  orderUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

export enum OrderStatus {
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED'
}

export const OrderStatusMap: Record<OrderStatus, string> = {
  [OrderStatus.COMPLETED]: '正常',
  [OrderStatus.REFUNDED]: '已退款'
}

// 你也可以导出一个数组，更方便用于 select options
export const OrderStatusOptions = Object.entries(OrderStatusMap).map(([value, label]) => ({
  value: value as OrderStatus, // 类型断言确保 value 是 OrderStatus 类型
  label: label
}))

type OrderCreate = Omit<Order, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type OrderId = Pick<Order, 'id'>

type OrderStore = {
  orderList: OrderDetail[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: OrderPageParams
  getOrderList: (data: OrderPageParams) => Promise<void>
  setPageParams: (data: Partial<OrderPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createOrder: (data: OrderCreate) => Promise<boolean>

  updateOrder: (data: OrderId & OrderCreate) => Promise<boolean>

  deleteOrder: (data: OrderId) => Promise<boolean>
  deleteLoading: boolean

  order: OrderDetail | null
  getLoading: boolean
  getOrder: (data: OrderId) => Promise<void>
  setOrder: (data: OrderDetail | null) => void

  getAllOrderLoading: boolean
  getAllOrder: () => Promise<void>
  allOrder: OrderDetail[]

  refundLoading: boolean
  refundOrder: (data: OrderId) => Promise<boolean>
}

const useOrderStore = create<OrderStore>((set, get) => ({
  orderList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0
  },
  pageParams: {
    page: 1,
    pageSize: 10,
    status: '',
    customerIds: [],
    groupBuyIds: []
  },
  getOrderList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res: ResponseBody<ListByPage<OrderDetail[]>> = await http.post(orderListApi, data)
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        orderList: res.data.data,
        listCount: { totalCount: res.data.totalCount, totalPages: res.data.totalPages }
      })
    } finally {
      set({ listLoading: false })
    }
  },
  setPageParams: data => {
    const originalPageParams = get().pageParams
    const newPageParams = {
      ...originalPageParams,
      ...data
    }
    set({
      pageParams: newPageParams
    })
    get().getOrderList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createOrder: async data => {
    try {
      set({ createLoading: true })
      await http.post(orderCreateApi, data)
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      set({ createLoading: false })
      get().getOrderList(get().pageParams)
    }
  },

  updateOrder: async data => {
    try {
      set({ createLoading: true })
      await http.post(orderUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      // get().getOrderList(get().pageParams)
      get().getOrder({ id: data.id })
    }
  },

  deleteLoading: false,
  deleteOrder: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(orderDeleteApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
    }
  },

  order: null,
  getLoading: false,
  getOrder: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post(orderDetailApi, data)
      set({ order: res.data })
    } finally {
      set({ getLoading: false })
    }
  },
  setOrder: data => {
    set({ order: data })
  },

  getAllOrderLoading: false,
  getAllOrder: async () => {
    try {
      set({ getAllOrderLoading: true })
      const res = await http.post(orderListAllApi)
      set({
        allOrder: res.data || []
      })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllOrderLoading: false })
    }
  },
  allOrder: [],

  refundLoading: false,
  refundOrder: async data => {
    try {
      set({ refundLoading: true })
      await http.post(orderRefundApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ refundLoading: false })
      get().getOrder(data)
    }
  }
}))

export default useOrderStore
