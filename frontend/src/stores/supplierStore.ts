import { Supplier } from 'fresh-shop-backend/types/dto.ts'
import { ListByPage, SupplierPageParams } from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  supplierCreateApi,
  supplierDeleteApi,
  supplierDetailApi,
  supplierListAllApi,
  supplierListApi,
  supplierUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type SupplierCreate = Omit<Supplier, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type SupplierId = Pick<Supplier, 'id'>

type SupplierStore = {
  suppliersList: Supplier[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: SupplierPageParams
  getSuppliersList: (data: SupplierPageParams) => Promise<void>
  setPageParams: (data: Partial<SupplierPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createSupplier: (data: SupplierCreate) => Promise<boolean>

  updateSupplier: (data: SupplierId & Partial<SupplierCreate>) => Promise<boolean>

  deleteSupplier: (data: SupplierId) => Promise<boolean>
  deleteLoading: boolean

  supplier: Supplier | null
  getLoading: boolean
  getSupplier: (data: SupplierId) => Promise<void>
  setSupplier: (data: Supplier | null) => void

  getAllSuppliersLoading: boolean
  getAllSuppliers: () => Promise<void>
  allSupplierList: Supplier[]
}

const useSupplierStore = create<SupplierStore>((set, get) => ({
  suppliersList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0
  },
  pageParams: {
    page: 1,
    pageSize: 10,
    name: '',
    phone: '',
    wechat: ''
  },
  getSuppliersList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res: ResponseBody<ListByPage<Supplier[]>> = await http.post(supplierListApi, data)
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        suppliersList: res.data.data,
        listCount: { totalCount: res.data.totalCount, totalPages: res.data.totalPages }
      })
    } finally {
      set({ listLoading: false })
    }
  },
  setPageParams: data => {
    const originalPageParams = get().pageParams
    const newPageParams = {
      ...originalPageParams,
      ...data
    }
    set({
      pageParams: newPageParams
    })
    get().getSuppliersList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createSupplier: async data => {
    try {
      set({ createLoading: true })
      await http.post(supplierCreateApi, data)
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      set({ createLoading: false })
      get().getSuppliersList(get().pageParams)
    }
  },

  updateSupplier: async data => {
    try {
      set({ createLoading: true })
      await http.post(supplierUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      // get().getSuppliersList(get().pageParams)
      get().getSupplier({ id: data.id })
    }
  },

  deleteLoading: false,
  deleteSupplier: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(supplierDeleteApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
    }
  },

  supplier: null,
  getLoading: false,
  getSupplier: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post(supplierDetailApi, data)
      set({ supplier: res.data })
    } finally {
      set({ getLoading: false })
    }
  },
  setSupplier: data => {
    set({ supplier: data })
  },

  getAllSuppliersLoading: false,
  getAllSuppliers: async () => {
    try {
      set({ getAllSuppliersLoading: true })
      const res = await http.post(supplierListAllApi)
      set({ allSupplierList: res.data })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllSuppliersLoading: false })
    }
  },
  allSupplierList: []
}))

export default useSupplierStore
