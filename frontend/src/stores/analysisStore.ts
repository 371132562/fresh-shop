import {
  AnalysisCountParams,
  AnalysisCountResult,
  CustomerRankResult,
  GroupBuyRankResult,
  MergedGroupBuyCustomerRankParams,
  MergedGroupBuyCustomerRankResult,
  MergedGroupBuyRankResult,
  SupplierRankResult
} from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import {
  analysisCountApi,
  analysisCustomerRankApi,
  analysisGroupBuyRankApi,
  analysisMergedGroupBuyCustomerRankApi,
  analysisMergedGroupBuyRankApi,
  analysisSupplierRankApi
} from '@/services/apis.ts'
import http from '@/services/base'

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
  getSupplierRankLoading: false
}))

export default useAnalysisStore
