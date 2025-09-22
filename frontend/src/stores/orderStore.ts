import { message } from 'antd'
import {
  BatchCreateOrdersParams,
  BatchCreateOrdersResult,
  ListByPage,
  Order,
  OrderDetail,
  OrderPageParams,
  OrderStatsResult,
  PartialRefundParams
} from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  orderBatchCreateApi,
  orderCreateApi,
  orderDeleteApi,
  orderDetailApi,
  orderListAllApi,
  orderListApi,
  orderPartialRefundApi,
  orderRefundApi,
  orderStatsApi,
  orderUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

// 后端 OrderStatus 类型
type BackendOrderStatus = 'NOTPAID' | 'PAID' | 'COMPLETED' | 'REFUNDED'

// 将后端 OrderStatus 转换为前端 OrderStatus
const convertBackendToFrontendStatus = (backendStatus: BackendOrderStatus): OrderStatus => {
  const statusMap: Record<BackendOrderStatus, OrderStatus> = {
    NOTPAID: OrderStatus.NOTPAID,
    PAID: OrderStatus.PAID,
    COMPLETED: OrderStatus.COMPLETED,
    REFUNDED: OrderStatus.REFUNDED
  }
  return statusMap[backendStatus]
}

export enum OrderStatus {
  NOTPAID = 'NOTPAID',
  PAID = 'PAID',
  COMPLETED = 'COMPLETED',
  REFUNDED = 'REFUNDED'
}

export const OrderStatusMap: Record<OrderStatus, { label: string; color: string }> = {
  [OrderStatus.NOTPAID]: { label: '待付款', color: '#f5bc2d' },
  [OrderStatus.PAID]: { label: '已付款', color: '#2db7f5' },
  [OrderStatus.COMPLETED]: { label: '已完成', color: '#87d068' },
  [OrderStatus.REFUNDED]: { label: '已退款', color: '#f50' }
}

// 你也可以导出一个数组，更方便用于 select options
export const OrderStatusOptions = Object.entries(OrderStatusMap).map(([value, content]) => ({
  value: value as OrderStatus, // 类型断言确保 value 是 OrderStatus 类型
  label: content.label,
  color: content.color
}))

// UI 伪状态：部分s（非已退款且部分退款金额>0）
export const PSEUDO_STATUS_PARTIAL_REFUND = 'PARTIAL_REFUND'
export const ExtendedOrderStatusOptions = [
  ...OrderStatusOptions,
  { value: PSEUDO_STATUS_PARTIAL_REFUND, label: '部分退款', color: '#fa8c16' }
]

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
  batchCreateOrders: (data: BatchCreateOrdersParams) => Promise<BatchCreateOrdersResult | null>

  updateOrder: (data: OrderId & Partial<OrderCreate>) => Promise<boolean>

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

  partialRefundLoading: boolean
  partialRefundOrder: (data: PartialRefundParams) => Promise<boolean>

  // 订单统计相关状态
  orderStats: OrderStatsResult | null
  statsLoading: boolean
  // 订单统计相关方法
  getOrderStats: () => Promise<void>
  clearOrderStats: () => void

  // 订单状态工具函数
  getNextOrderStatus: (currentStatus: BackendOrderStatus) => OrderStatus | null
  canUpdateOrderStatus: (currentStatus: BackendOrderStatus) => boolean
  getNextOrderStatusLabel: (currentStatus: BackendOrderStatus) => string
  handleUpdateOrderStatus: (
    order: Order,
    updateOrderFn: (data: { id: string; status: OrderStatus }) => Promise<boolean>,
    onSuccess?: () => void,
    onError?: () => void
  ) => Promise<void>
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
    statuses: [],
    customerIds: [],
    groupBuyIds: []
  },
  // 订单统计相关状态初始化
  orderStats: null,
  statsLoading: false,
  getOrderList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const payload: Record<string, unknown> = { ...data }
      // 将伪状态映射为 hasPartialRefund 标志，并从真实 statuses 中剔除
      const statuses = payload.statuses as string[] | undefined
      if (Array.isArray(statuses) && statuses.includes(PSEUDO_STATUS_PARTIAL_REFUND)) {
        payload.hasPartialRefund = true
        payload.statuses = statuses.filter((s: string) => s !== PSEUDO_STATUS_PARTIAL_REFUND)
      }
      const res: ResponseBody<ListByPage<OrderDetail[]>> = await http.post(orderListApi, payload)
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
      get().getOrderStats()
    }
  },

  batchCreateOrders: async data => {
    try {
      set({ createLoading: true })
      const res: ResponseBody<BatchCreateOrdersResult> = await http.post(orderBatchCreateApi, data)
      return res.data
    } catch (error) {
      console.error(error)
      return null
    } finally {
      set({ createLoading: false })
      get().getOrderList(get().pageParams)
      get().getOrderStats()
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
      get().getOrderList(get().pageParams)
      get().getOrder({ id: data.id })
      // 更新订单后自动刷新统计数据
      get().getOrderStats()
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
      // 删除订单后更新订单统计数据
      get().getOrderStats()
      get().getOrderList(get().pageParams)
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
  },

  partialRefundLoading: false,
  partialRefundOrder: async (data: PartialRefundParams) => {
    try {
      set({ partialRefundLoading: true })
      await http.post(orderPartialRefundApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ partialRefundLoading: false })
    }
  },

  // 订单统计相关方法实现
  getOrderStats: async () => {
    try {
      set({ statsLoading: true })
      const res = await http.post(orderStatsApi)
      set({ orderStats: res.data })
    } catch (err) {
      console.error(err)
    } finally {
      set({ statsLoading: false })
    }
  },
  clearOrderStats: () => {
    set({ orderStats: null })
  },

  // 订单状态工具函数实现
  getNextOrderStatus: (currentStatus: BackendOrderStatus): OrderStatus | null => {
    const frontendStatus = convertBackendToFrontendStatus(currentStatus)
    const orderStatusValues = Object.values(OrderStatus) as OrderStatus[]
    const currentIndex = orderStatusValues.findIndex(status => status === frontendStatus)

    if (currentIndex < orderStatusValues.length - 1) {
      return orderStatusValues[currentIndex + 1]
    }

    return null
  },

  canUpdateOrderStatus: (currentStatus: BackendOrderStatus): boolean => {
    return get().getNextOrderStatus(currentStatus) !== null
  },

  getNextOrderStatusLabel: (currentStatus: BackendOrderStatus): string => {
    const nextStatus = get().getNextOrderStatus(currentStatus)
    return nextStatus ? OrderStatusMap[nextStatus].label : '无'
  },

  handleUpdateOrderStatus: async (
    order: Order,
    updateOrderFn: (data: { id: string; status: OrderStatus }) => Promise<boolean>,
    onSuccess?: () => void,
    onError?: () => void
  ) => {
    if (!order.id) return

    const nextStatus = get().getNextOrderStatus(order.status as BackendOrderStatus)
    if (!nextStatus) {
      message.info('订单已是最终状态，无法继续修改')
      return
    }

    const res = await updateOrderFn({
      id: order.id,
      status: nextStatus
    })

    if (res) {
      message.success(`订单状态已更新为：${OrderStatusMap[nextStatus].label}`)
      onSuccess?.()
    } else {
      message.error('更新订单状态失败')
      onError?.()
    }
  }
}))

export default useOrderStore
