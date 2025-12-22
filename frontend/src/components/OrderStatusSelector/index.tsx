import { Select, Tag } from 'antd'

import { ExtendedOrderStatusOptions, OrderStatusOptions } from '@/stores/orderStore.ts'

type OrderStatusSelectorProps = {
  value?: string | string[]
  onChange?: (value: string | string[] | undefined) => void
  mode?: 'multiple' | 'tags' | undefined
  popupMatchSelectWidth?: boolean | number
  onClear?: () => void
  disabled?: boolean
  useExtended?: boolean // 是否使用扩展选项（包含部分退款）
  allowClear?: boolean
}

/**
 * 订单状态选择器组件
 * 提供统一的订单状态选择界面，支持单选和多选模式
 * 支持基础状态和扩展状态（包含部分退款）
 */
const OrderStatusSelector = ({
  value,
  onChange,
  mode,
  popupMatchSelectWidth,
  onClear,
  disabled = false,
  useExtended = true,
  allowClear = true
}: OrderStatusSelectorProps) => {
  // 根据useExtended参数选择使用基础选项还是扩展选项
  const options = useExtended ? ExtendedOrderStatusOptions : OrderStatusOptions

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder="请选择订单状态"
      allowClear={allowClear}
      disabled={disabled}
      mode={mode}
      popupMatchSelectWidth={popupMatchSelectWidth}
      onClear={onClear}
    >
      {options.map(option => (
        <Select.Option
          key={option.value}
          value={option.value}
        >
          <Tag
            variant="solid"
            color={option.color}
          >
            {option.label}
          </Tag>
        </Select.Option>
      ))}
    </Select>
  )
}

export default OrderStatusSelector
