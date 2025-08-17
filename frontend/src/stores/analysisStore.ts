import { create } from 'zustand'

import {
  analysisCountApi,
  analysisCustomerRankApi,
  analysisGroupBuyRankApi,
  analysisMergedGroupBuyFrequencyCustomersApi,
  analysisMergedGroupBuyOverviewApi,
  analysisMergedGroupBuyOverviewDetailApi,
  analysisMergedGroupBuyRegionalCustomersApi,
  analysisSupplierRankApi
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
  setCustomerListData: (data: CustomerBasicInfo[]) => void
  setCustomerListLoading: (loading: boolean) => void
  setCustomerListTitle: (title: string) => void
  resetCustomerList: () => void
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
  setCustomerListData: (data: CustomerBasicInfo[]) => {
    set({ customerListData: data })
  },
  setCustomerListLoading: (loading: boolean) => {
    set({ customerListLoading: loading })
  },
  setCustomerListTitle: (title: string) => {
    set({ customerListTitle: title })
  },
  resetCustomerList: () => {
    set({ customerListData: [], customerListLoading: false, customerListTitle: '' })
  }
}))

export default useAnalysisStore
