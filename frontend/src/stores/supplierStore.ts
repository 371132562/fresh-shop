import { Supplier } from 'fresh-shop-common/types/dto.ts'
import { create } from 'zustand'

import http from '../services/base.ts'

type SupplierCreate = Omit<Supplier, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type SupplierId = Pick<Supplier, 'id'>

type SupplierStore = {
  suppliersList: Supplier[]
  pageParams: {
    page: number
    pageSize: number
  }
  listLoading: boolean
  createLoading: boolean
  deleteLoading: boolean
  setPageParams: (data: { page: number; pageSize: number }) => void
  fetchSuppliersList: (data: any) => Promise<void>
  createSupplier: (data: SupplierCreate) => Promise<boolean>
  updateSupplier: (data: SupplierCreate & SupplierId) => Promise<void>
  deleteSupplier: (data: SupplierId) => Promise<void>
}

const useSupplierStore = create<SupplierStore>((set, get) => ({
  suppliersList: [],
  pageParams: {
    page: 1,
    pageSize: 10
  },
  listLoading: false,
  createLoading: false,
  deleteLoading: false,
  setPageParams: (data: { page: number; pageSize: number }) => {
    set({ pageParams: data })
    get().fetchSuppliersList(data)
  },
  fetchSuppliersList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res = await http.post('/supplier/list', data)
      set({ suppliersList: res.data.data })
    } finally {
      set({ listLoading: false })
    }
  },
  createSupplier: async data => {
    try {
      set({ createLoading: true })
      await http.post('/supplier/create', data)
      return true
    } catch (error) {
      console.error(error)
      return false
    } finally {
      set({ createLoading: false })
      get().fetchSuppliersList(get().pageParams)
    }
  },
  updateSupplier: async (data: SupplierCreate & SupplierId) => {
    try {
      set({ createLoading: true })
      await http.post(`/supplier/update`, data)
    } finally {
      set({ createLoading: false })
      get().fetchSuppliersList(get().pageParams)
    }
  },
  deleteSupplier: async (data: SupplierId) => {
    try {
      set({ deleteLoading: true })
      await http.post(`/supplier/delete`, data)
    } finally {
      set({ deleteLoading: false })
    }
  }
}))

export default useSupplierStore
