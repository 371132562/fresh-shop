import { create } from 'zustand'

import {
  analysisCountApi,
  analysisCustomerRankApi,
  analysisGroupBuyRankApi,
  analysisMergedGroupBuyCustomerRankApi,
  analysisMergedGroupBuyFrequencyCustomersApi,
  analysisMergedGroupBuyOverviewApi,
  analysisMergedGroupBuyOverviewDetailApi,
  analysisMergedGroupBuyRankApi,
  analysisMergedGroupBuyRegionalCustomersApi,
  analysisSupplierRankApi
} from '@/services/apis'
import http from '@/services/base'

import type {
  AnalysisCountParams,
  AnalysisCountResult,
  CustomerRankResult,
  GroupBuyRankResult,
  MergedGroupBuyCustomerRankParams,
  MergedGroupBuyCustomerRankResult,
  MergedGroupBuyFrequencyCustomersParams,
  MergedGroupBuyFrequencyCustomersResult,
  MergedGroupBuyOverviewDetail,
  MergedGroupBuyOverviewDetailParams,
  MergedGroupBuyOverviewParams,
  MergedGroupBuyOverviewResult,
  MergedGroupBuyRankResult,
  MergedGroupBuyRegionalCustomersParams,
  MergedGroupBuyRegionalCustomersResult,
  SupplierRankResult
} from '../../../backend/types/dto'

type AnalysisStore = {
  count: AnalysisCountResult
  getCount: (data: AnalysisCountParams) => Promise<void>
  getCountLoading: boolean

  // 团购单排行榜数据
  groupBuyRank: GroupBuyRankResult
  getGroupBuyRank: (data: AnalysisCountParams) => Promise<void>
  getGroupBuyRankLoading: boolean

  // 团购单（合并）排行榜数据
  mergedGroupBuyRank: MergedGroupBuyRankResult
  getMergedGroupBuyRank: (data: AnalysisCountParams) => Promise<void>
  getMergedGroupBuyRankLoading: boolean

  // 合并团购单客户排行榜数据
  mergedGroupBuyCustomerRank: MergedGroupBuyCustomerRankResult | null
  getMergedGroupBuyCustomerRank: (data: MergedGroupBuyCustomerRankParams) => Promise<void>
  getMergedGroupBuyCustomerRankLoading: boolean
  resetMergedGroupBuyCustomerRank: () => void

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
}

const useAnalysisStore = create<AnalysisStore>(set => ({
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

  // 团购单（合并）排行榜数据
  mergedGroupBuyRank: {
    mergedGroupBuyRankByOrderCount: [],
    mergedGroupBuyRankByTotalSales: [],
    mergedGroupBuyRankByTotalProfit: []
  },
  getMergedGroupBuyRank: async data => {
    try {
      set({ getMergedGroupBuyRankLoading: true })
      const res = await http.post<MergedGroupBuyRankResult>(analysisMergedGroupBuyRankApi, data)
      set({ mergedGroupBuyRank: res.data })
    } finally {
      set({ getMergedGroupBuyRankLoading: false })
    }
  },
  getMergedGroupBuyRankLoading: false,

  // 合并团购单客户排行榜数据
  mergedGroupBuyCustomerRank: null,
  getMergedGroupBuyCustomerRank: async data => {
    set({ getMergedGroupBuyCustomerRankLoading: true })
    try {
      const res = await http.post(analysisMergedGroupBuyCustomerRankApi, data)
      set({ mergedGroupBuyCustomerRank: res.data })
    } catch (error) {
      console.error('获取合并团购单客户排行失败:', error)
    } finally {
      set({ getMergedGroupBuyCustomerRankLoading: false })
    }
  },
  getMergedGroupBuyCustomerRankLoading: false,
  resetMergedGroupBuyCustomerRank: () => {
    set({ mergedGroupBuyCustomerRank: null })
  },

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
    set({ mergedGroupBuyFrequencyCustomersLoading: true })
    try {
      const res = await http.post<MergedGroupBuyFrequencyCustomersResult>(
        analysisMergedGroupBuyFrequencyCustomersApi,
        params
      )
      set({ mergedGroupBuyFrequencyCustomers: res.data })
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
    set({ mergedGroupBuyRegionalCustomersLoading: true })
    try {
      const res = await http.post<MergedGroupBuyRegionalCustomersResult>(
        analysisMergedGroupBuyRegionalCustomersApi,
        params
      )
      set({ mergedGroupBuyRegionalCustomers: res.data })
    } finally {
      set({ mergedGroupBuyRegionalCustomersLoading: false })
    }
  },
  resetMergedGroupBuyRegionalCustomers: () => {
    set({ mergedGroupBuyRegionalCustomers: null })
  }
}))

export default useAnalysisStore
