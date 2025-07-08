import { ProductType } from 'fresh-shop-backend/types/dto.ts'
import { ListByPage, ProductTypePageParams } from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  productTypeCreateApi,
  productTypeDeleteApi,
  productTypeDetailApi,
  productTypeListAllApi,
  productTypeListApi,
  productTypeUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type ProductTypeId = Pick<ProductType, 'id'>

type ProductTypeCreate = Omit<ProductType, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type ProductTypeStore = {
  productTypesList: ProductType[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: ProductTypePageParams
  getProductTypeList: (data: Partial<ProductTypePageParams>) => Promise<void>
  setPageParams: (data: Partial<ProductTypePageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createProductType: (data: ProductTypeCreate) => Promise<boolean>

  updateProductType: (data: ProductTypeId & Partial<ProductTypeCreate>) => Promise<boolean>

  deleteProductType: (data: ProductTypeId) => Promise<boolean>
  deleteLoading: boolean

  getLoading: boolean
  productType: ProductType | null
  getProductType: (data: ProductTypeId) => Promise<void>
  setProductType: (data: ProductType | null) => void

  getAllProductTypesLoading: boolean
  getAllProductTypes: () => Promise<void>
  allProductTypes: ProductType[]
}

const useProductTypeStore = create<ProductTypeStore>((set, get) => ({
  productTypesList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0
  },
  pageParams: {
    name: '',
    page: 1,
    pageSize: 10
  },
  getProductTypeList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res: ResponseBody<ListByPage<ProductType[]>> = await http.post(productTypeListApi, data)
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        productTypesList: res.data.data,
        listCount: { totalCount: res.data.totalCount, totalPages: res.data.totalPages }
      })
    } finally {
      set({ listLoading: false })
    }
  },
  setPageParams: (data = get().pageParams) => {
    const originalPageParams = get().pageParams
    const newPageParams = {
      ...originalPageParams,
      ...data
    }
    set({
      pageParams: newPageParams
    })
    get().getProductTypeList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createProductType: async data => {
    try {
      set({ createLoading: true })
      await http.post(productTypeCreateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getProductTypeList(get().pageParams)
    }
  },

  updateProductType: async data => {
    try {
      set({ createLoading: true })
      await http.post(productTypeUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getProductTypeList(get().pageParams)
    }
  },

  deleteLoading: false,
  deleteProductType: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(productTypeDeleteApi, data)
      get().getProductTypeList(get().pageParams)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
    }
  },

  getLoading: false,
  productType: null,
  getProductType: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post(productTypeDetailApi, data)
      set({ productType: res.data })
    } catch (err) {
      console.error(err)
    }
  },
  setProductType: data => {
    set({
      productType: data
    })
  },

  getAllProductTypesLoading: false,
  allProductTypes: [],
  getAllProductTypes: async () => {
    try {
      set({ getAllProductTypesLoading: true })
      const res = await http.post(productTypeListAllApi)
      set({
        allProductTypes: res.data || []
      })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllProductTypesLoading: false })
    }
  }
}))

export default useProductTypeStore
