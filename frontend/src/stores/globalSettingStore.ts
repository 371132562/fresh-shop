import {
  GlobalSettingUpsertParams,
  GlobalSettingWithTypedValue
} from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import { globalSettingDetailApi, globalSettingUpsertApi } from '@/services/apis.ts'
import http from '@/services/base.ts'
import { deleteOrphanImages, type OrphanImageItem, scanOrphanImages } from '@/services/common.ts'

export type GlobalSettingState = {
  globalSetting?: GlobalSettingWithTypedValue
  getGlobalSettingLoading: boolean
  upsertGlobalSettingLoading: boolean
  // 孤立图片
  orphanScanLoading: boolean
  orphanDeleteLoading: boolean
  orphanImages: OrphanImageItem[]
}

export type GlobalSettingActions = {
  getGlobalSetting: (data: { key: string }) => Promise<boolean>
  upsertGlobalSetting: (data: GlobalSettingUpsertParams) => Promise<boolean>
  scanOrphans: () => Promise<boolean>
  deleteOrphans: (filenames: string[]) => Promise<{ deleted: string[]; skipped: string[] } | null>
}

const useGlobalSettingStore = create<GlobalSettingState & GlobalSettingActions>((set, get) => ({
  globalSetting: undefined,
  getGlobalSettingLoading: false,
  upsertGlobalSettingLoading: false,
  orphanScanLoading: false,
  orphanDeleteLoading: false,
  orphanImages: [],

  async getGlobalSetting(data) {
    set({ getGlobalSettingLoading: true })
    try {
      const res = await http.post(globalSettingDetailApi, data)
      set({ globalSetting: res.data })
      return true
    } catch {
      return false
    } finally {
      set({ getGlobalSettingLoading: false })
    }
  },

  async upsertGlobalSetting(data) {
    set({ upsertGlobalSettingLoading: true })
    try {
      await http.post(globalSettingUpsertApi, data)
      await get().getGlobalSetting({ key: data.key })
      return true
    } catch {
      return false
    } finally {
      set({ upsertGlobalSettingLoading: false })
    }
  },

  async scanOrphans() {
    set({ orphanScanLoading: true })
    try {
      const res = await scanOrphanImages()
      set({ orphanImages: res.data.list })
      return true
    } catch {
      return false
    } finally {
      set({ orphanScanLoading: false })
    }
  },

  async deleteOrphans(filenames) {
    set({ orphanDeleteLoading: true })
    try {
      const res = await deleteOrphanImages({ filenames })
      // 从状态中移除已删除的
      const remain = get().orphanImages.filter(item => !res.data.deleted.includes(item.filename))
      set({ orphanImages: remain })
      return res.data
    } catch {
      return null
    } finally {
      set({ orphanDeleteLoading: false })
    }
  }
}))

export default useGlobalSettingStore
