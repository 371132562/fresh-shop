import { ListByPage, Supplier } from 'fresh-shop-common/types/dto.ts'
import { ResponseBody } from 'fresh-shop-common/types/response.ts'
import { create } from 'zustand'

import {
  supplierCreateApi,
  supplierDeleteApi,
  supplierDetailApi,
  supplierListApi,
  supplierUpdateApi
} from '../services/apis.ts'
import http from '../services/base.ts'

type SupplierCreate = Omit<Supplier, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type SupplierId = Pick<Supplier, 'id'>

type SupplierStore = {
  suppliersList: Supplier[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: {
    name: string
    phone: string
    wechat: string
    page: number
    pageSize: number
  }
  getSuppliersList: (data: any) => Promise<void>
  setPageParams: (data: { page: number; pageSize: number }) => void
  listLoading: boolean

  createLoading: boolean
  createSupplier: (data: SupplierCreate) => Promise<boolean>

  updateSupplier: (data: SupplierCreate & SupplierId) => Promise<boolean>
  deleteSupplier: (data: SupplierId) => Promise<void>
  deleteLoading: boolean

  supplier: Supplier
  getLoading: boolean
  getSupplier: (data: SupplierId) => Promise<Supplier>
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
      set({
        suppliersList: res.data.data,
        listCount: { totalCount: res.data.totalCount, totalPages: res.data.totalPages }
      })
    } finally {
      set({ listLoading: false })
    }
  },
  setPageParams: (data: { page: number; pageSize: number }) => {
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

  updateSupplier: async (data: SupplierCreate & SupplierId) => {
    try {
      set({ createLoading: true })
      await http.post(supplierUpdateApi, data)
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      set({ createLoading: false })
      // get().getSuppliersList(get().pageParams)
      get().getSupplier({ id: data.id })
    }
  },

  deleteLoading: false,
  deleteSupplier: async (data: SupplierId) => {
    try {
      set({ deleteLoading: true })
      await http.post(supplierDeleteApi, data)
    } finally {
      set({ deleteLoading: false })
    }
  },

  supplier: {},
  getLoading: false,
  getSupplier: async (data: SupplierId) => {
    try {
      set({ getLoading: true })
      const res = await http.post(supplierDetailApi, data)
      set({ supplier: res.data })
    } finally {
      set({ getLoading: false })
    }
  }
}))

export default useSupplierStore
