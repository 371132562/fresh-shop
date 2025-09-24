import { Select } from 'antd'
import { useEffect } from 'react'

import useCustomerStore from '@/stores/customerStore.ts'

type CustomerSelectorProps = {
  value?: string | string[]
  onChange?: (value: string | string[] | undefined) => void
  mode?: 'multiple' | 'tags' | undefined
  popupMatchSelectWidth?: boolean | number
  onClear?: () => void
}

/**
 * 客户选择器组件
 * 提供统一的客户选择界面，支持单选和多选模式
 * 包含搜索、过滤、自定义渲染等功能
 */
const CustomerSelector = ({
  value,
  onChange,
  mode,
  popupMatchSelectWidth,
  onClear
}: CustomerSelectorProps) => {
  // 从store获取客户数据和加载状态
  const allCustomer = useCustomerStore(state => state.allCustomer)
  const getAllCustomer = useCustomerStore(state => state.getAllCustomer)
  const getAllCustomerLoading = useCustomerStore(state => state.getAllCustomerLoading)

  // 组件挂载时获取客户数据
  useEffect(() => {
    if (allCustomer.length === 0) {
      getAllCustomer()
    }
  }, [])

  // 客户选择器的过滤函数
  // 支持按客户名称和手机号进行搜索
  const filterOption = (
    input: string,
    option: { label: string; phone?: string | null } | undefined
  ): boolean => {
    if (!option) return false
    return (
      (option.label?.toLowerCase().includes(input.toLowerCase()) ?? false) ||
      (option.phone ? option.phone.toLowerCase().includes(input.toLowerCase()) : false)
    )
  }

  // 自定义选项渲染
  // 显示客户名称和手机号，手机号以灰色小字显示
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optionRender = (option: any) => (
    <div>
      <div className="font-medium">{option.label}</div>
      <div className="text-xs text-gray-500">{option.data?.phone}</div>
    </div>
  )

  // 将客户数据转换为Select组件需要的格式
  const options = allCustomer.map(customer => ({
    value: customer.id,
    label: customer.name,
    phone: customer.phone || undefined
  }))

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={'请选择客户'}
      loading={getAllCustomerLoading}
      showSearch
      allowClear
      mode={mode}
      popupMatchSelectWidth={popupMatchSelectWidth}
      onClear={onClear}
      filterOption={filterOption}
      options={options}
      optionRender={optionRender}
    />
  )
}

export default CustomerSelector
