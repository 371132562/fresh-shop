import { Select } from 'antd'
import { useEffect } from 'react'

import useProductStore from '@/stores/productStore.ts'

type ProductSelectorProps = {
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
 * 商品选择器组件
 * 提供统一的商品选择界面，支持单选和多选模式
 */
const ProductSelector = ({
  value,
  onChange,
  mode,
  popupMatchSelectWidth,
  onClear,
  disabled = false,
  allowClear,
  placeholder
}: ProductSelectorProps) => {
  const allProductsList = useProductStore(state => state.allProductsList)
  const getAllProducts = useProductStore(state => state.getAllProducts)
  const getAllProductsListLoading = useProductStore(state => state.getAllProductsListLoading)

  useEffect(() => {
    if ((allProductsList?.length || 0) === 0) {
      getAllProducts()
    }
  }, [])

  const filterOption = (input: string, option: { label: string } | undefined): boolean => {
    if (!option) return false
    return String(option.label ?? '')
      .toLowerCase()
      .includes(input.toLowerCase())
  }

  const options = (allProductsList || []).map(product => ({
    value: product.id,
    label: product.name
  }))

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder={placeholder ?? '请选择商品'}
      loading={getAllProductsListLoading}
      showSearch
      allowClear={allowClear}
      disabled={disabled}
      mode={mode}
      popupMatchSelectWidth={popupMatchSelectWidth}
      onClear={onClear}
      filterOption={filterOption}
      options={options}
    />
  )
}

export default ProductSelector
