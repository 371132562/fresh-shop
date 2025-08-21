import { create } from 'zustand'

import {
  analysisCountApi,
  analysisCustomerRankApi,
  analysisGroupBuyRankApi,
  analysisMergedGroupBuyFrequencyCustomersApi,
  analysisMergedGroupBuyOverviewApi,
  analysisMergedGroupBuyOverviewDetailApi,
  analysisMergedGroupBuyRegionalCustomersApi,
  analysisSupplierFrequencyCustomersApi,
  analysisSupplierOverviewApi,
  analysisSupplierOverviewDetailApi,
  analysisSupplierRankApi,
  analysisSupplierRegionalCustomersApi
} from '@/services/apis'
import http from '@/services/base'

import type {
  AnalysisCountParams,
  AnalysisCountResult,
  CustomerBasicInfo,
  CustomerRankResult,
  GroupBuyRankResult,
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
  SupplierOverviewParams,
  SupplierOverviewResult,
  SupplierRankResult,
  SupplierRegionalCustomersParams,
  SupplierRegionalCustomersResult
} from '../../../backend/types/dto'

type AnalysisStore = {
  count: AnalysisCountResult
  getCount: (data: AnalysisCountParams) => Promise<void>
  getCountLoading: boolean

  // 团购单排行榜数据
  groupBuyRank: GroupBuyRankResult
  getGroupBuyRank: (data: AnalysisCountParams) => Promise<void>
  getGroupBuyRankLoading: boolean

  // 客户排行榜数据
  customerRank: CustomerRankResult
  getCustomerRank: (data: AnalysisCountParams) => Promise<void>
  getCustomerRankLoading: boolean

  // 供货商排行榜数据
  supplierRank: SupplierRankResult
  getSupplierRank: (data: AnalysisCountParams) => Promise<void>
  getSupplierRankLoading: boolean

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
  setCustomerListData: (data: CustomerBasicInfo[]) => void
  setCustomerListLoading: (loading: boolean) => void
  setCustomerListTitle: (title: string) => void
  setCustomerListVisible: (visible: boolean) => void
  resetCustomerList: () => void

  // 处理购买频次点击事件
  handleFrequencyClick: (frequency: number) => Promise<void>

  // 处理地域点击事件
  handleRegionalClick: (addressId: string, addressName: string) => Promise<void>

  // 供货商概况数据
  supplierOverviewList: SupplierOverviewResult['list']
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
    profitTrend: []
  },
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

  // 团购单排行榜数据
  groupBuyRank: {
    groupBuyRankByOrderCount: [],
    groupBuyRankByTotalSales: [],
    groupBuyRankByTotalProfit: []
  },
  getGroupBuyRank: async data => {
    try {
      set({ getGroupBuyRankLoading: true })
      const res = await http.post<GroupBuyRankResult>(analysisGroupBuyRankApi, data)
      set({ groupBuyRank: res.data })
    } finally {
      set({ getGroupBuyRankLoading: false })
    }
  },
  getGroupBuyRankLoading: false,

  // 客户排行榜数据
  customerRank: {
    customerRankByOrderCount: [],
    customerRankByTotalAmount: [],
    customerRankByAverageOrderAmount: []
  },
  getCustomerRank: async data => {
    set({ getCustomerRankLoading: true })
    try {
      const res = await http.post(analysisCustomerRankApi, data)
      set({ customerRank: res.data })
    } catch (error) {
      console.error('获取客户排行榜失败:', error)
    } finally {
      set({ getCustomerRankLoading: false })
    }
  },
  getCustomerRankLoading: false,

  // 供货商排行榜数据
  supplierRank: {
    supplierRankByOrderCount: [],
    supplierRankByTotalSales: [],
    supplierRankByTotalProfit: []
  },
  getSupplierRank: async data => {
    try {
      set({ getSupplierRankLoading: true })
      const res = await http.post<SupplierRankResult>(analysisSupplierRankApi, data)
      set({ supplierRank: res.data })
    } finally {
      set({ getSupplierRankLoading: false })
    }
  },
  getSupplierRankLoading: false,

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
      customerListVisible: false
    })
  },

  // 处理购买频次点击事件
  handleFrequencyClick: async (frequency: number) => {
    const state = get()
    const detail = state.mergedGroupBuyOverviewDetail
    const supplierDetail = state.supplierOverviewDetail

    if (!detail && !supplierDetail) return

    set({
      customerListTitle: `购买${frequency}次 的客户列表`,
      customerListLoading: true,
      customerListData: [],
      customerListVisible: true
    })

    // 根据当前详情类型调用不同的接口
    if (detail) {
      // 团购详情
      await state.getMergedGroupBuyFrequencyCustomers({
        groupBuyName: detail.groupBuyName,
        supplierId: detail.supplierId,
        frequency,
        startDate: detail.startDate,
        endDate: detail.endDate
      })
    } else if (supplierDetail) {
      // 供货商详情
      await state.getSupplierFrequencyCustomers({
        supplierId: supplierDetail.supplierId,
        frequency,
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
      customerListVisible: true
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
  }
}))

export default useAnalysisStore
