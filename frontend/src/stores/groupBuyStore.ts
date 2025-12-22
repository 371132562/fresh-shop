import { GroupBuyPageParams, ListByPage } from 'fresh-shop-backend/types/dto.ts'
import {
  AllGroupBuyItem,
  GroupBuy,
  GroupBuyDetail,
  GroupBuyListItem
} from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  groupBuyCreateApi,
  groupBuyDeleteApi,
  groupBuyDetailApi,
  groupBuyListAllApi,
  groupBuyListApi,
  groupBuyUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'
import { PSEUDO_STATUS_PARTIAL_REFUND } from '@/stores/orderStore.ts'

import useOrderStore from './orderStore'

export type GroupBuyCreate = Omit<GroupBuy, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

export type GroupBuyId = Pick<GroupBuy, 'id'>

type GroupBuyStore = {
  groupBuyList: GroupBuyListItem[]
  listCount: {
    totalCount: number
    totalPages: number
    noOrderCount: number
  }
  pageParams: GroupBuyPageParams
  getGroupBuyList: (data: GroupBuyPageParams) => Promise<void>
  setPageParams: (data: Partial<GroupBuyPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createGroupBuy: (data: GroupBuyCreate) => Promise<boolean>

  updateGroupBuy: (data: GroupBuyId & Partial<GroupBuyCreate>) => Promise<boolean>

  deleteGroupBuy: (data: GroupBuyId) => Promise<boolean>
  deleteLoading: boolean

  groupBuy: GroupBuyDetail | null
  getLoading: boolean
  getGroupBuy: (data: GroupBuyId) => Promise<void>
  setGroupBuy: (data: GroupBuyDetail | null) => void

  getAllGroupBuyLoading: boolean
  getAllGroupBuy: () => Promise<void>
  allGroupBuy: AllGroupBuyItem[]
}

const useGroupBuyStore = create<GroupBuyStore>((set, get) => ({
  groupBuyList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0,
    noOrderCount: 0
  },
  pageParams: {
    page: 1,
    pageSize: 10,
    name: '',
    supplierIds: [],
    productIds: [],
    startDate: null,
    endDate: null,
    orderStatuses: [], // 订单状态筛选数组
    sortField: 'groupBuyStartDate', // 默认按发起时间排序
    sortOrder: 'desc' // 默认降序
  },
  getGroupBuyList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const payload: Record<string, unknown> = { ...data }
      // 将伪状态映射为 hasPartialRefund，并从真实 orderStatuses 中剔除
      const orderStatuses = payload.orderStatuses as string[] | undefined
      if (Array.isArray(orderStatuses) && orderStatuses.includes(PSEUDO_STATUS_PARTIAL_REFUND)) {
        payload.hasPartialRefund = true
        payload.orderStatuses = orderStatuses.filter(
          (s: string) => s !== PSEUDO_STATUS_PARTIAL_REFUND
        )
      }
      const res: ResponseBody<ListByPage<GroupBuyListItem[]>> = await http.post(
        groupBuyListApi,
        payload
      )
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        groupBuyList: res.data.data,
        listCount: {
          totalCount: res.data.totalCount,
          totalPages: res.data.totalPages,
          noOrderCount: res.data.noOrderCount ?? 0
        }
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
    get().getGroupBuyList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createGroupBuy: async data => {
    try {
      set({ createLoading: true })
      await http.post(groupBuyCreateApi, data)
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      set({ createLoading: false })
      get().getGroupBuyList(get().pageParams)
    }
  },

  updateGroupBuy: async data => {
    try {
      set({ createLoading: true })
      await http.post(groupBuyUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getGroupBuyList(get().pageParams)
      get().getGroupBuy({ id: data.id })
    }
  },

  deleteLoading: false,
  deleteGroupBuy: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(groupBuyDeleteApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
      useOrderStore.getState().getOrderStats()
      get().getGroupBuyList(get().pageParams)
    }
  },

  groupBuy: null,
  getLoading: false,
  getGroupBuy: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post(groupBuyDetailApi, data)
      set({ groupBuy: res.data })
    } finally {
      set({ getLoading: false })
    }
  },
  setGroupBuy: data => {
    set({ groupBuy: data })
  },

  getAllGroupBuyLoading: false,
  getAllGroupBuy: async () => {
    try {
      set({ getAllGroupBuyLoading: true })
      const res = await http.post(groupBuyListAllApi)
      set({
        allGroupBuy: res.data || []
      })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllGroupBuyLoading: false })
    }
  },
  allGroupBuy: []
}))

export default useGroupBuyStore
