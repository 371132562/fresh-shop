import {
  Customer,
  CustomerAddressConsumptionDetailDto,
  CustomerConsumptionDetailDto,
  CustomerListItem,
  CustomerPageParams,
  ListByPage
} from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import {
  customerAddressConsumptionDetailApi,
  customerConsumptionDetailApi,
  customerCreateApi,
  customerDeleteApi,
  customerDetailApi,
  customerListAllApi,
  customerListApi,
  customerUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type CustomerId = Pick<Customer, 'id'>

type CustomerCreate = Omit<Customer, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

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

  updateCustomer: (data: CustomerId & Partial<CustomerCreate>) => Promise<boolean>

  deleteCustomer: (data: CustomerId) => Promise<boolean>
  deleteLoading: boolean

  customer: Customer | null
  getLoading: boolean
  getCustomer: (data: CustomerId) => Promise<void>
  setCustomer: (data: Customer | null) => void

  getAllCustomerLoading: boolean
  getAllCustomer: () => Promise<void>
  allCustomer: Customer[]

  consumptionDetail: CustomerConsumptionDetailDto | null
  consumptionDetailLoading: boolean
  getConsumptionDetail: (
    data: string | { id: string; startDate?: Date; endDate?: Date }
  ) => Promise<void>
  resetConsumptionDetail: () => void

  // 地址消费详情相关
  addressConsumptionDetail: CustomerAddressConsumptionDetailDto | null
  addressConsumptionDetailLoading: boolean
  getAddressConsumptionDetail: (id: string) => Promise<void>
  setAddressConsumptionDetail: (data: CustomerAddressConsumptionDetailDto | null) => void
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
    pageSize: 10,
    sortField: 'createdAt' as CustomerPageParams['sortField'],
    sortOrder: 'desc' as CustomerPageParams['sortOrder']
  },
  getCustomerList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res = await http.post<ListByPage<CustomerListItem[]>>(customerListApi, data)
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
      const res = await http.post<Customer>(customerDetailApi, data)
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
  getLoading: false,

  getAllCustomerLoading: false,
  getAllCustomer: async () => {
    try {
      set({ getAllCustomerLoading: true })
      const res = await http.post<Customer[]>(customerListAllApi)
      set({
        allCustomer: res.data || []
      })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllCustomerLoading: false })
    }
  },
  allCustomer: [],

  consumptionDetail: null as CustomerConsumptionDetailDto | null,
  consumptionDetailLoading: false,
  getConsumptionDetail: async (data: string | { id: string; startDate?: Date; endDate?: Date }) => {
    set({ consumptionDetailLoading: true })
    try {
      const payload = typeof data === 'string' ? { id: data } : data
      const res = await http.post<CustomerConsumptionDetailDto>(
        customerConsumptionDetailApi,
        payload
      )
      set({ consumptionDetail: res.data, consumptionDetailLoading: false })
    } catch (error) {
      console.error(error)
      set({ consumptionDetailLoading: false })
    }
  },
  resetConsumptionDetail: () => {
    set({
      consumptionDetail: null,
      consumptionDetailLoading: false
    })
  },

  // 地址消费详情相关
  addressConsumptionDetail: null as CustomerAddressConsumptionDetailDto | null,
  addressConsumptionDetailLoading: false,
  getAddressConsumptionDetail: async (id: string) => {
    set({ addressConsumptionDetailLoading: true })
    try {
      const res = await http.post<CustomerAddressConsumptionDetailDto>(
        customerAddressConsumptionDetailApi,
        {
          id
        }
      )
      set({ addressConsumptionDetail: res.data, addressConsumptionDetailLoading: false })
    } catch (error) {
      console.error(error)
      set({ addressConsumptionDetailLoading: false })
    }
  },
  setAddressConsumptionDetail: (data: CustomerAddressConsumptionDetailDto | null) => {
    set({ addressConsumptionDetail: data })
  }
}))

export default useCustomerStore
