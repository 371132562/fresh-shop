import { Product } from 'fresh-shop-backend/types/dto.ts'
import { ListByPage, ProductPageParams } from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  productCreateApi,
  productDeleteApi,
  productDetailApi,
  productListApi,
  productUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type ProductId = Pick<Product, 'id'>

type ProductCreate = Omit<Product, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type ProductListItem = Product & { productTypeName: string }

type ProductStore = {
  productsList: ProductListItem[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: ProductPageParams
  getProductList: (data: ProductPageParams) => Promise<void>
  setPageParams: (data: Partial<ProductPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createProduct: (data: ProductCreate) => Promise<boolean>

  updateProduct: (data: ProductId & ProductCreate) => Promise<boolean>

  deleteProduct: (data: ProductId) => Promise<boolean>
  deleteLoading: boolean

  product: Product | null
  getLoading: boolean
  getProduct: (data: ProductId) => Promise<void>
  setProduct: (data: Product | null) => void
}

const useProductStore = create<ProductStore>((set, get) => ({
  productsList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0
  },
  pageParams: {
    name: '',
    productTypeIds: [],
    page: 1,
    pageSize: 10
  },
  getProductList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res: ResponseBody<ListByPage<ProductListItem[]>> = await http.post(productListApi, data)
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        productsList: res.data.data,
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
    get().getProductList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createProduct: async data => {
    try {
      set({ createLoading: true })
      await http.post(productCreateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getProductList(get().pageParams)
    }
  },

  updateProduct: async data => {
    try {
      set({ createLoading: true })
      await http.post(productUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getProductList(get().pageParams)
    }
  },

  deleteLoading: false,
  deleteProduct: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(productDeleteApi, data)
      get().getProductList(get().pageParams)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
    }
  },

  product: null,
  getProduct: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post(productDetailApi, data)
      set({ product: res.data })
    } catch (err) {
      console.error(err)
    }
  },
  setProduct: data => {
    set({
      product: data
    })
  },
  getLoading: false
}))

export default useProductStore
