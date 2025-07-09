import {
  AnalysisCountParams,
  AnalysisCountResult,
  AnalysisRankResult
} from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import { analysisCountApi, analysisRankApi } from '@/services/apis.ts'
import http from '@/services/base'

type AnalysisStore = {
  count: AnalysisCountResult
  getCount: (data: AnalysisCountParams) => Promise<void>
  getCountLoading: boolean
  rank: AnalysisRankResult
  getRank: (data: AnalysisCountParams) => Promise<void>
  getRankLoading: boolean
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
  rank: {
    groupBuyRankByOrderCount: [],
    groupBuyRankByTotalSales: [],
    groupBuyRankByTotalProfit: [],
    supplierRankByGroupBuyCount: []
  },
  getRank: async data => {
    try {
      set({ getRankLoading: true })
      const res = await http.post<AnalysisRankResult>(analysisRankApi, data)
      set({ rank: res.data })
    } finally {
      set({ getRankLoading: false })
    }
  },
  getRankLoading: false
}))

export default useAnalysisStore
