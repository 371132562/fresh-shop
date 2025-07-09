import { AnalysisCountParams, AnalysisCountResult } from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import { analysisCountApi } from '@/services/apis.ts'
import http from '@/services/base'

type AnalysisStore = {
  count: AnalysisCountResult
  getCount: (data: AnalysisCountParams) => Promise<void>
  getCountLoading: boolean
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
  getCountLoading: false
}))

export default useAnalysisStore
