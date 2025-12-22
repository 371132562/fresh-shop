import { Product, ProductListItem } from 'fresh-shop-backend/types/dto.ts'
import { ListByPage, ProductPageParams } from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  productCreateApi,
  productDeleteApi,
  productDetailApi,
  productListAllApi,
  productListApi,
  productUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type ProductId = Pick<Product, 'id'>

type ProductCreate = Omit<Product, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type ProductStore = {
  productsList: ProductListItem[]
  listCount: {
    totalCount: number
    totalPages: number
    noOrderCount: number
  }
  pageParams: ProductPageParams
  getProductList: (data: ProductPageParams) => Promise<void>
  setPageParams: (data: Partial<ProductPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createProduct: (data: ProductCreate) => Promise<boolean>

  updateProduct: (data: ProductId & Partial<ProductCreate>) => Promise<boolean>

  deleteProduct: (data: ProductId) => Promise<boolean>
  deleteLoading: boolean

  product: Product | null
  getLoading: boolean
  getProduct: (data: ProductId) => Promise<void>
  setProduct: (data: Product | null) => void

  getAllProductsListLoading: boolean
  getAllProducts: () => Promise<void>
  allProductsList: ProductListItem[]
}

const useProductStore = create<ProductStore>((set, get) => ({
  productsList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0,
    noOrderCount: 0
  },
  pageParams: {
    name: '',
    productTypeIds: [],
    page: 1,
    pageSize: 10,
    sortField: 'createdAt' as const,
    sortOrder: 'desc' as const
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
        listCount: {
          totalCount: res.data.totalCount,
          totalPages: res.data.totalPages,
          noOrderCount: res.data.noOrderCount ?? 0
        }
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
      get().getProductList(get().pageParams)
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
  getLoading: false,

  getAllProductsListLoading: false,
  getAllProducts: async () => {
    try {
      set({ getAllProductsListLoading: true })
      const res = await http.post(productListAllApi)
      set({ allProductsList: res.data })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllProductsListLoading: false })
    }
  },
  allProductsList: []
}))

export default useProductStore
