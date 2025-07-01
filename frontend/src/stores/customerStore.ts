import { Customer } from 'fresh-shop-backend/types/dto.ts'
import { CustomerPageParams, ListByPage } from 'fresh-shop-backend/types/dto.ts'
import { ResponseBody } from 'fresh-shop-backend/types/response.ts'
import { create } from 'zustand'

import {
  customerCreateApi,
  customerDeleteApi,
  customerDetailApi,
  customerListApi,
  customerUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type CustomerId = Pick<Customer, 'id'>

type CustomerCreate = Omit<Customer, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type CustomerListItem = Customer & { customerAddressName: string }

type CustomerStore = {
  customersList: CustomerListItem[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: CustomerPageParams
  getCustomerList: (data: CustomerPageParams) => Promise<void>
  setPageParams: (data: Partial<CustomerPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createCustomer: (data: CustomerCreate) => Promise<boolean>

  updateCustomer: (data: CustomerId & CustomerCreate) => Promise<boolean>

  deleteCustomer: (data: CustomerId) => Promise<boolean>
  deleteLoading: boolean

  customer: Customer | null
  getLoading: boolean
  getCustomer: (data: CustomerId) => Promise<void>
  setCustomer: (data: Customer | null) => void
}

const useCustomerStore = create<CustomerStore>((set, get) => ({
  customersList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0
  },
  pageParams: {
    name: '',
    phone: '',
    wechat: '',
    customerAddressIds: [],
    page: 1,
    pageSize: 10
  },
  getCustomerList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res: ResponseBody<ListByPage<CustomerListItem[]>> = await http.post(
        customerListApi,
        data
      )
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        customersList: res.data.data,
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
    get().getCustomerList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createCustomer: async data => {
    try {
      set({ createLoading: true })
      await http.post(customerCreateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getCustomerList(get().pageParams)
    }
  },

  updateCustomer: async data => {
    try {
      set({ createLoading: true })
      await http.post(customerUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getCustomerList(get().pageParams)
    }
  },

  deleteLoading: false,
  deleteCustomer: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(customerDeleteApi, data)
      get().getCustomerList(get().pageParams)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
    }
  },

  customer: null,
  getCustomer: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post(customerDetailApi, data)
      set({ customer: res.data })
    } catch (err) {
      console.error(err)
    }
  },
  setCustomer: data => {
    set({
      customer: data
    })
  },
  getLoading: false
}))

export default useCustomerStore
