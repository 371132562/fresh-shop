import { GlobalSetting, GlobalSettingWithTypedValue } from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import { globalSettingDetailApi, globalSettingUpsertApi } from '@/services/apis.ts'
import http from '@/services/base.ts'

type GlobalSettingCreate = Omit<GlobalSetting, 'id' | 'delete' | 'createdAt' | 'updatedAt'>
type GlobalSettingDetailParam = Pick<GlobalSetting, 'key'>

type GlobalSettingStore = {
  globalSetting: GlobalSettingWithTypedValue | null
  getGlobalSettingLoading: boolean
  getGlobalSetting: (data: GlobalSettingDetailParam) => Promise<void>
  upsertGlobalSettingLoading: boolean
  upsertGlobalSetting: (data: GlobalSettingCreate) => Promise<void>
}

const useGlobalSettingStore = create<GlobalSettingStore>(set => ({
  globalSetting: null,
  getGlobalSettingLoading: false,
  getGlobalSetting: async data => {
    try {
      set({ getGlobalSettingLoading: true })
      const res = await http.post<GlobalSetting>(globalSettingDetailApi, data)
      set({
        globalSetting: res.data as GlobalSettingWithTypedValue,
        getGlobalSettingLoading: false
      })
    } finally {
      set({ getGlobalSettingLoading: false })
    }
  },
  upsertGlobalSettingLoading: false,
  upsertGlobalSetting: async data => {
    try {
      set({ upsertGlobalSettingLoading: true })
      const res = await http.post<GlobalSetting>(globalSettingUpsertApi, data)
      set({
        globalSetting: res.data as GlobalSettingWithTypedValue,
        upsertGlobalSettingLoading: false
      })
    } finally {
      set({ upsertGlobalSettingLoading: false })
    }
  }
}))

export default useGlobalSettingStore
