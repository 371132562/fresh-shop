import {
  CustomerAddress,
  CustomerAddressConsumptionDetailDto,
  CustomerAddressListItem,
  CustomerAddressSortField,
  SortOrder
} from 'fresh-shop-backend/types/dto.ts'
import { CustomerAddressPageParams, ListByPage } from 'fresh-shop-backend/types/dto.ts'
import { create } from 'zustand'

import {
  customerAddressConsumptionDetailApi,
  customerAddressCreateApi,
  customerAddressDeleteApi,
  customerAddressDetailApi,
  customerAddressListAllApi,
  customerAddressListApi,
  customerAddressUpdateApi
} from '@/services/apis.ts'
import http from '@/services/base.ts'

type CustomerAddressId = Pick<CustomerAddress, 'id'>

type CustomerAddressCreate = Omit<CustomerAddress, 'id' | 'delete' | 'createdAt' | 'updatedAt'>

type CustomerAddressStore = {
  customerAddressList: CustomerAddressListItem[]
  listCount: {
    totalCount: number
    totalPages: number
  }
  pageParams: CustomerAddressPageParams
  getCustomerAddressList: (data: CustomerAddressPageParams) => Promise<void>
  setPageParams: (data: Partial<CustomerAddressPageParams>) => void
  listLoading: boolean

  createLoading: boolean
  createCustomerAddress: (data: CustomerAddressCreate) => Promise<boolean>

  updateCustomerAddress: (
    data: CustomerAddressId & Partial<CustomerAddressCreate>
  ) => Promise<boolean>

  deleteCustomerAddress: (data: CustomerAddressId) => Promise<boolean>
  deleteLoading: boolean

  getLoading: boolean
  customerAddress: CustomerAddress | null
  getCustomerAddress: (data: CustomerAddressId) => Promise<void>
  setCustomerAddress: (data: CustomerAddress | null) => void

  getAllCustomerAddressLoading: boolean
  getAllCustomerAddress: () => Promise<void>
  allCustomerAddress: CustomerAddress[]

  // 地址消费详情相关
  consumptionDetailLoading: boolean
  addressConsumptionDetail: CustomerAddressConsumptionDetailDto | null
  getAddressConsumptionDetail: (data: CustomerAddressId) => Promise<void>
  setAddressConsumptionDetail: (data: CustomerAddressConsumptionDetailDto | null) => void
}

const useCustomerAddressStore = create<CustomerAddressStore>((set, get) => ({
  customerAddressList: [],
  listCount: {
    totalCount: 0,
    totalPages: 0
  },
  pageParams: {
    name: '',
    page: 1,
    pageSize: 10,
    sortField: 'createdAt' as CustomerAddressSortField,
    sortOrder: 'desc' as SortOrder
  },
  getCustomerAddressList: async (data = get().pageParams) => {
    try {
      set({ listLoading: true })
      const res = await http.post<ListByPage<CustomerAddressListItem[]>>(
        customerAddressListApi,
        data
      )
      if (res.data.page > res.data.totalPages && res.data.totalPages) {
        get().setPageParams({ page: res.data.totalPages || 1 })
        return
      }
      set({
        customerAddressList: res.data.data,
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
    get().getCustomerAddressList(newPageParams)
  },
  listLoading: false,

  createLoading: false,
  createCustomerAddress: async data => {
    try {
      set({ createLoading: true })
      await http.post(customerAddressCreateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getCustomerAddressList(get().pageParams)
    }
  },

  updateCustomerAddress: async data => {
    try {
      set({ createLoading: true })
      await http.post(customerAddressUpdateApi, data)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ createLoading: false })
      get().getCustomerAddressList(get().pageParams)
    }
  },

  deleteLoading: false,
  deleteCustomerAddress: async data => {
    try {
      set({ deleteLoading: true })
      await http.post(customerAddressDeleteApi, data)
      get().getCustomerAddressList(get().pageParams)
      return true
    } catch (err) {
      console.error(err)
      return false
    } finally {
      set({ deleteLoading: false })
    }
  },

  getLoading: false,
  customerAddress: null,
  getCustomerAddress: async data => {
    try {
      set({ getLoading: true })
      const res = await http.post<CustomerAddress>(customerAddressDetailApi, data)
      set({ customerAddress: res.data })
    } catch (err) {
      console.error(err)
    }
  },
  setCustomerAddress: data => {
    set({
      customerAddress: data
    })
  },

  getAllCustomerAddressLoading: false,
  allCustomerAddress: [],
  getAllCustomerAddress: async () => {
    try {
      set({ getAllCustomerAddressLoading: true })
      const res = await http.post<CustomerAddress[]>(customerAddressListAllApi)
      set({
        allCustomerAddress: res.data || []
      })
    } catch (err) {
      console.error(err)
    } finally {
      set({ getAllCustomerAddressLoading: false })
    }
  },

  // 地址消费详情相关
  consumptionDetailLoading: false,
  addressConsumptionDetail: null,
  getAddressConsumptionDetail: async data => {
    try {
      set({ consumptionDetailLoading: true })
      const res = await http.post<CustomerAddressConsumptionDetailDto>(
        customerAddressConsumptionDetailApi,
        data
      )
      set({ addressConsumptionDetail: res.data })
    } catch (err) {
      console.error(err)
    } finally {
      set({ consumptionDetailLoading: false })
    }
  },
  setAddressConsumptionDetail: data => {
    set({
      addressConsumptionDetail: data
    })
  }
}))

export default useCustomerAddressStore
