import { create } from 'zustand'

import {
  analysisCountApi,
  analysisCustomerOverviewApi,
  analysisMergedGroupBuyFrequencyCustomersApi,
  analysisMergedGroupBuyOverviewApi,
  analysisMergedGroupBuyOverviewDetailApi,
  analysisMergedGroupBuyRegionalCustomersApi,
  analysisSupplierFrequencyCustomersApi,
  analysisSupplierOverviewApi,
  analysisSupplierOverviewDetailApi,
  analysisSupplierRegionalCustomersApi
} from '@/services/apis'
import http from '@/services/base'

import type {
  AnalysisCountParams,
  AnalysisCountResult,
  CustomerBasicInfo,
  CustomerOverviewParams,
  CustomerOverviewResult,
  MergedGroupBuyFrequencyCustomersParams,
  MergedGroupBuyFrequencyCustomersResult,
  MergedGroupBuyOverviewDetail,
  MergedGroupBuyOverviewDetailParams,
  MergedGroupBuyOverviewParams,
  MergedGroupBuyOverviewResult,
  MergedGroupBuyRegionalCustomersParams,
  MergedGroupBuyRegionalCustomersResult,
  SupplierFrequencyCustomersParams,
  SupplierFrequencyCustomersResult,
  SupplierOverviewDetail,
  SupplierOverviewDetailParams,
  SupplierOverviewListItem,
  SupplierOverviewParams,
  SupplierOverviewResult,
  SupplierRegionalCustomersParams,
  SupplierRegionalCustomersResult
} from '../../../backend/types/dto'

type AnalysisStore = {
  count: AnalysisCountResult
  getCount: (data: AnalysisCountParams) => Promise<void>
  getCountLoading: boolean

  // 全部数据模式标记（用于前端展示控制）
  isAllData: boolean
  setIsAllData: (flag: boolean) => void

  // 团购单合并概况数据
  mergedGroupBuyOverviewList: MergedGroupBuyOverviewResult['list']
  mergedGroupBuyOverviewTotal: number
  mergedGroupBuyOverviewPage: number
  mergedGroupBuyOverviewPageSize: number
  mergedGroupBuyOverviewLoading: boolean
  getMergedGroupBuyOverview: (data: MergedGroupBuyOverviewParams) => Promise<void>
  setMergedGroupBuyOverviewPage: (page: number) => void

  // 团购单合并概况详情数据
  mergedGroupBuyOverviewDetail: MergedGroupBuyOverviewDetail | null
  mergedGroupBuyOverviewDetailLoading: boolean
  getMergedGroupBuyOverviewDetail: (params: MergedGroupBuyOverviewDetailParams) => Promise<void>
  resetMergedGroupBuyOverviewDetail: () => void

  // 获取特定购买频次的客户列表
  mergedGroupBuyFrequencyCustomers: MergedGroupBuyFrequencyCustomersResult | null
  mergedGroupBuyFrequencyCustomersLoading: boolean
  getMergedGroupBuyFrequencyCustomers: (
    params: MergedGroupBuyFrequencyCustomersParams
  ) => Promise<void>
  resetMergedGroupBuyFrequencyCustomers: () => void

  // 获取特定区域的客户列表
  mergedGroupBuyRegionalCustomers: MergedGroupBuyRegionalCustomersResult | null
  mergedGroupBuyRegionalCustomersLoading: boolean
  getMergedGroupBuyRegionalCustomers: (
    params: MergedGroupBuyRegionalCustomersParams
  ) => Promise<void>
  resetMergedGroupBuyRegionalCustomers: () => void

  // 客户列表模态框状态
  customerListData: CustomerBasicInfo[]
  customerListLoading: boolean
  customerListTitle: string
  customerListVisible: boolean
  customerListShowPurchaseCount: boolean
  setCustomerListData: (data: CustomerBasicInfo[]) => void
  setCustomerListLoading: (loading: boolean) => void
  setCustomerListTitle: (title: string) => void
  setCustomerListVisible: (visible: boolean) => void
  resetCustomerList: () => void

  // 处理购买频次点击事件
  handleFrequencyClick: (minFrequency: number, maxFrequency?: number | null) => Promise<void>

  // 处理地域点击事件
  handleRegionalClick: (addressId: string, addressName: string) => Promise<void>

  // 供货商概况数据
  supplierOverviewList: SupplierOverviewListItem[]
  supplierOverviewTotal: number
  supplierOverviewPage: number
  supplierOverviewPageSize: number
  supplierOverviewLoading: boolean
  getSupplierOverview: (data: SupplierOverviewParams) => Promise<void>
  setSupplierOverviewPage: (page: number) => void

  // 供货商概况详情数据
  supplierOverviewDetail: SupplierOverviewDetail | null
  supplierOverviewDetailLoading: boolean
  getSupplierOverviewDetail: (params: SupplierOverviewDetailParams) => Promise<void>
  resetSupplierOverviewDetail: () => void

  // 获取供货商特定购买频次的客户列表
  getSupplierFrequencyCustomers: (params: SupplierFrequencyCustomersParams) => Promise<void>

  // 获取供货商特定区域的客户列表
  getSupplierRegionalCustomers: (params: SupplierRegionalCustomersParams) => Promise<void>

  // 客户概况数据
  customerOverviewList: CustomerOverviewResult['list']
  customerOverviewTotal: number
  customerOverviewPage: number
  customerOverviewPageSize: number
  customerOverviewLoading: boolean
  getCustomerOverview: (data: CustomerOverviewParams) => Promise<void>
  setCustomerOverviewPage: (page: number) => void
}

const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  count: {
    groupBuyCount: 0,
    orderCount: 0,
    totalPrice: 0,
    totalProfit: 0,
    groupBuyTrend: [],
    orderTrend: [],
    priceTrend: [],
    profitTrend: [],
    cumulativeGroupBuyTrend: [],
    cumulativeOrderTrend: [],
    cumulativePriceTrend: [],
    cumulativeProfitTrend: []
  },
  isAllData: false,
  setIsAllData: flag => set({ isAllData: flag }),
  getCount: async data => {
    try {
      set({ getCountLoading: true })
      const res = await http.post<AnalysisCountResult>(analysisCountApi, data)
      set({ count: res.data })
    } finally {
      set({ getCountLoading: false })
    }
  },
  getCountLoading: false,

  // 团购单合并概况数据
  mergedGroupBuyOverviewList: [],
  mergedGroupBuyOverviewTotal: 0,
  mergedGroupBuyOverviewPage: 1,
  mergedGroupBuyOverviewPageSize: 10,
  mergedGroupBuyOverviewLoading: false,
  getMergedGroupBuyOverview: async data => {
    try {
      set({ mergedGroupBuyOverviewLoading: true })
      const res = await http.post<MergedGroupBuyOverviewResult>(
        analysisMergedGroupBuyOverviewApi,
        data
      )
      set({
        mergedGroupBuyOverviewList: res.data.list,
        mergedGroupBuyOverviewTotal: res.data.total,
        mergedGroupBuyOverviewPage: res.data.page,
        mergedGroupBuyOverviewPageSize: res.data.pageSize
      })
    } finally {
      set({ mergedGroupBuyOverviewLoading: false })
    }
  },
  setMergedGroupBuyOverviewPage: page => {
    set({ mergedGroupBuyOverviewPage: page })
  },

  // 团购单合并概况详情数据
  mergedGroupBuyOverviewDetail: null,
  mergedGroupBuyOverviewDetailLoading: false,
  getMergedGroupBuyOverviewDetail: async params => {
    set({ mergedGroupBuyOverviewDetailLoading: true })
    try {
      const res = await http.post(analysisMergedGroupBuyOverviewDetailApi, params)
      set({ mergedGroupBuyOverviewDetail: res.data })
    } finally {
      set({ mergedGroupBuyOverviewDetailLoading: false })
    }
  },
  resetMergedGroupBuyOverviewDetail: () => {
    set({ mergedGroupBuyOverviewDetail: null })
  },

  // 获取特定购买频次的客户列表
  mergedGroupBuyFrequencyCustomers: null,
  mergedGroupBuyFrequencyCustomersLoading: false,
  getMergedGroupBuyFrequencyCustomers: async (params: MergedGroupBuyFrequencyCustomersParams) => {
    try {
      set({ mergedGroupBuyFrequencyCustomersLoading: true })
      const res = await http.post<MergedGroupBuyFrequencyCustomersResult>(
        analysisMergedGroupBuyFrequencyCustomersApi,
        params
      )
      set({
        mergedGroupBuyFrequencyCustomers: res.data,
        customerListData: res.data.customers,
        customerListLoading: false
      })
    } finally {
      set({ mergedGroupBuyFrequencyCustomersLoading: false })
    }
  },
  resetMergedGroupBuyFrequencyCustomers: () => {
    set({ mergedGroupBuyFrequencyCustomers: null })
  },

  // 获取特定区域的客户列表
  mergedGroupBuyRegionalCustomers: null,
  mergedGroupBuyRegionalCustomersLoading: false,
  getMergedGroupBuyRegionalCustomers: async (params: MergedGroupBuyRegionalCustomersParams) => {
    try {
      set({ mergedGroupBuyRegionalCustomersLoading: true })
      const res = await http.post<MergedGroupBuyRegionalCustomersResult>(
        analysisMergedGroupBuyRegionalCustomersApi,
        params
      )
      set({
        mergedGroupBuyRegionalCustomers: res.data,
        customerListData: res.data.customers,
        customerListLoading: false
      })
    } finally {
      set({ mergedGroupBuyRegionalCustomersLoading: false })
    }
  },
  resetMergedGroupBuyRegionalCustomers: () => {
    set({ mergedGroupBuyRegionalCustomers: null })
  },

  // 客户列表模态框状态管理
  customerListData: [],
  customerListLoading: false,
  customerListTitle: '',
  customerListVisible: false,
  customerListShowPurchaseCount: false,
  setCustomerListData: (data: CustomerBasicInfo[]) => {
    set({ customerListData: data })
  },
  setCustomerListLoading: (loading: boolean) => {
    set({ customerListLoading: loading })
  },
  setCustomerListTitle: (title: string) => {
    set({ customerListTitle: title })
  },
  setCustomerListVisible: (visible: boolean) => {
    set({ customerListVisible: visible })
  },
  resetCustomerList: () => {
    set({
      customerListData: [],
      customerListLoading: false,
      customerListTitle: '',
      customerListVisible: false,
      customerListShowPurchaseCount: false
    })
  },

  // 处理购买频次点击事件
  handleFrequencyClick: async (minFrequency: number, maxFrequency?: number | null) => {
    const state = get()
    const detail = state.mergedGroupBuyOverviewDetail
    const supplierDetail = state.supplierOverviewDetail

    if (!detail && !supplierDetail) return

    const titleLabel = (() => {
      if (maxFrequency == null) return `购买${minFrequency}次及以上 的客户列表`
      if (minFrequency === maxFrequency) return `购买${minFrequency}次 的客户列表`
      return `购买${minFrequency}-${maxFrequency}次 的客户列表`
    })()

    set({
      customerListTitle: titleLabel,
      customerListLoading: true,
      customerListData: [],
      customerListVisible: true,
      customerListShowPurchaseCount: true
    })

    // 根据当前详情类型调用不同的接口
    if (detail) {
      // 团购详情
      await state.getMergedGroupBuyFrequencyCustomers({
        groupBuyName: detail.groupBuyName,
        supplierId: detail.supplierId,
        minFrequency,
        maxFrequency: maxFrequency ?? undefined,
        startDate: detail.startDate,
        endDate: detail.endDate
      })
    } else if (supplierDetail) {
      // 供货商详情
      await state.getSupplierFrequencyCustomers({
        supplierId: supplierDetail.supplierId,
        minFrequency,
        maxFrequency: maxFrequency ?? undefined,
        startDate: supplierDetail.startDate,
        endDate: supplierDetail.endDate
      })
    }
  },

  // 处理地域点击事件
  handleRegionalClick: async (addressId: string, addressName: string) => {
    const state = get()
    const detail = state.mergedGroupBuyOverviewDetail
    const supplierDetail = state.supplierOverviewDetail

    if (!detail && !supplierDetail) return

    set({
      customerListTitle: `${addressName} 地址的客户列表`,
      customerListLoading: true,
      customerListData: [],
      customerListVisible: true,
      customerListShowPurchaseCount: false
    })

    // 根据当前详情类型调用不同的接口
    if (detail) {
      // 团购详情
      await state.getMergedGroupBuyRegionalCustomers({
        groupBuyName: detail.groupBuyName,
        supplierId: detail.supplierId,
        addressId,
        startDate: detail.startDate,
        endDate: detail.endDate
      })
    } else if (supplierDetail) {
      // 供货商详情
      await state.getSupplierRegionalCustomers({
        supplierId: supplierDetail.supplierId,
        addressId,
        startDate: supplierDetail.startDate,
        endDate: supplierDetail.endDate
      })
    }
  },

  // 供货商概况数据
  supplierOverviewList: [],
  supplierOverviewTotal: 0,
  supplierOverviewPage: 1,
  supplierOverviewPageSize: 10,
  supplierOverviewLoading: false,
  getSupplierOverview: async data => {
    try {
      set({ supplierOverviewLoading: true })
      const res = await http.post<SupplierOverviewResult>(analysisSupplierOverviewApi, data)
      set({
        supplierOverviewList: res.data.list,
        supplierOverviewTotal: res.data.total,
        supplierOverviewPage: res.data.page,
        supplierOverviewPageSize: res.data.pageSize
      })
    } finally {
      set({ supplierOverviewLoading: false })
    }
  },
  setSupplierOverviewPage: page => {
    set({ supplierOverviewPage: page })
  },

  // 供货商概况详情数据
  supplierOverviewDetail: null,
  supplierOverviewDetailLoading: false,
  getSupplierOverviewDetail: async params => {
    set({ supplierOverviewDetailLoading: true })
    try {
      const res = await http.post(analysisSupplierOverviewDetailApi, params)
      set({ supplierOverviewDetail: res.data })
    } finally {
      set({ supplierOverviewDetailLoading: false })
    }
  },
  resetSupplierOverviewDetail: () => {
    set({ supplierOverviewDetail: null })
  },

  // 获取供货商特定购买频次的客户列表
  getSupplierFrequencyCustomers: async (params: SupplierFrequencyCustomersParams) => {
    try {
      set({ customerListLoading: true })
      const res = await http.post<SupplierFrequencyCustomersResult>(
        analysisSupplierFrequencyCustomersApi,
        params
      )
      set({
        customerListData: res.data.customers,
        customerListLoading: false
      })
    } finally {
      set({ customerListLoading: false })
    }
  },

  // 获取供货商特定区域的客户列表
  getSupplierRegionalCustomers: async (params: SupplierRegionalCustomersParams) => {
    try {
      set({ customerListLoading: true })
      const res = await http.post<SupplierRegionalCustomersResult>(
        analysisSupplierRegionalCustomersApi,
        params
      )
      set({
        customerListData: res.data.customers,
        customerListLoading: false
      })
    } finally {
      set({ customerListLoading: false })
    }
  },

  // 客户概况数据
  customerOverviewList: [],
  customerOverviewTotal: 0,
  customerOverviewPage: 1,
  customerOverviewPageSize: 10,
  customerOverviewLoading: false,
  getCustomerOverview: async data => {
    try {
      set({ customerOverviewLoading: true })
      const res = await http.post<CustomerOverviewResult>(analysisCustomerOverviewApi, data)
      set({
        customerOverviewList: res.data.list,
        customerOverviewTotal: res.data.total,
        customerOverviewPage: res.data.page,
        customerOverviewPageSize: res.data.pageSize
      })
    } finally {
      set({ customerOverviewLoading: false })
    }
  },
  setCustomerOverviewPage: page => set({ customerOverviewPage: page })
}))

export default useAnalysisStore
