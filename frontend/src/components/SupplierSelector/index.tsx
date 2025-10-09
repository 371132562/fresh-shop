import { Select } from 'antd'
import { useEffect } from 'react'

import useSupplierStore from '@/stores/supplierStore.ts'

type SupplierSelectorProps = {
  value?: string | string[]
  onChange?: (value: string | string[] | undefined) => void
  mode?: 'multiple' | 'tags' | undefined
  popupMatchSelectWidth?: boolean | number
  onClear?: () => void
  disabled?: boolean
  allowClear?: boolean
  placeholder?: string
}

/**
 * 供货商选择器组件
 * 提供统一的供货商选择界面，支持单选和多选模式
 * 包含搜索、过滤、自定义渲染等功能
 */
const SupplierSelector = ({
  value,
  onChange,
  mode,
  popupMatchSelectWidth,
  onClear,
  disabled = false,
  allowClear,
  placeholder
}: SupplierSelectorProps) => {
  // 从store获取供货商数据和加载状态
  const allSupplierList = useSupplierStore(state => state.allSupplierList)
  const getAllSuppliers = useSupplierStore(state => state.getAllSuppliers)
  const getAllSuppliersLoading = useSupplierStore(state => state.getAllSuppliersLoading)

  // 组件挂载时获取供货商数据
  useEffect(() => {
    if ((allSupplierList?.length || 0) === 0) {
      getAllSuppliers()
    }
  }, [])

  // 过滤函数：支持按名称与手机号搜索
  const filterOption = (
    input: string,
    option: { label: string; phone?: string | null } | undefined
  ): boolean => {
    if (!option) return false
    const lower = input.toLowerCase()
    return (
      (option.label?.toLowerCase().includes(lower) ?? false) ||
      (option.phone ? option.phone.toLowerCase().includes(lower) : false)
    )
  }

  // 自定义选项渲染：显示名称与电话
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optionRender = (option: any) => (
    <div>
      <div className="font-medium">{option.label}</div>
      <div className="text-xs text-gray-500">{option.data?.phone}</div>
    </div>
  )

  // options
  const options = (allSupplierList || []).map(supplier => ({
    value: supplier.id,
    label: supplier.name,
    phone: (supplier as unknown as { phone?: string | null }).phone || undefined
  }))

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '请选择供货商'}
      loading={getAllSuppliersLoading}
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      mode={mode}
      popupMatchSelectWidth={popupMatchSelectWidth}
      onClear={onClear}
      filterOption={filterOption}
      options={options}
      optionRender={optionRender}
    />
  )
}

export default SupplierSelector
