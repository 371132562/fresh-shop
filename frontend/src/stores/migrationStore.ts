import { create } from 'zustand'

import { deduplicateImagesApi } from '@/services/apis'
import http from '@/services/base'

export type AffectedSupplier = {
  id: string
  name: string
}

export type AffectedGroupBuy = {
  id: string
  name: string
  groupBuyStartDate: Date
}

export type MigrationResult = {
  message: string
  uniqueImageCount: number
  totalFilesScanned: number
  duplicateFilesFound: number
  affectedSuppliers: AffectedSupplier[]
  affectedGroupBuys: AffectedGroupBuy[]
}

type MigrationState = {
  deduplicateImagesLoading: boolean
  deduplicateImagesResult: MigrationResult | null
  deduplicateImages: () => Promise<void>
  clearResult: () => void
}

const useMigrationStore = create<MigrationState>(set => ({
  deduplicateImagesLoading: false,
  deduplicateImagesResult: null,
  deduplicateImages: async () => {
    set({ deduplicateImagesLoading: true, deduplicateImagesResult: null })
    try {
      const res = await http.post<MigrationResult>(deduplicateImagesApi)
      set({ deduplicateImagesResult: res.data })
    } finally {
      set({ deduplicateImagesLoading: false })
    }
  },
  clearResult: () => {
    set({ deduplicateImagesResult: null })
  }
}))

export default useMigrationStore
