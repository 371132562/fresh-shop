import { Select } from 'antd'
import { useEffect } from 'react'

import useGroupBuyStore from '@/stores/groupBuyStore.ts'
import { formatDate } from '@/utils'

type GroupBuySelectorProps = {
  value?: string | string[]
  onChange?: (value: string | string[] | undefined) => void
  mode?: 'multiple' | 'tags' | undefined
  popupMatchSelectWidth?: boolean | number
  onClear?: () => void
  disabled?: boolean
}

/**
 * 团购单选择器组件
 * 提供统一的团购单选择界面，支持单选和多选模式
 * 第一行显示团购单名称，第二行显示发起时间
 */
const GroupBuySelector = ({
  value,
  onChange,
  mode,
  popupMatchSelectWidth,
  onClear,
  disabled = false
}: GroupBuySelectorProps) => {
  // 从store获取团购单数据和加载状态
  const allGroupBuy = useGroupBuyStore(state => state.allGroupBuy)
  const getAllGroupBuy = useGroupBuyStore(state => state.getAllGroupBuy)
  const getAllGroupBuyLoading = useGroupBuyStore(state => state.getAllGroupBuyLoading)

  // 组件挂载时获取团购单数据
  useEffect(() => {
    if (allGroupBuy.length === 0) {
      getAllGroupBuy()
    }
  }, [])

  // 团购单选择器的过滤函数
  // 支持按团购单名称进行搜索
  const filterOption = (input: string, option: { label: string } | undefined) => {
    if (!option) return false
    return String(option.label ?? '')
      .toLowerCase()
      .includes(input.toLowerCase())
  }

  // 自定义选项渲染
  // 第一行显示团购单名称，第二行显示发起时间
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const optionRender = (option: any) => (
    <div>
      <div className="font-medium">{option.label}</div>
      <div className="text-xs text-gray-500">
        发起日期：{formatDate(option.data?.groupBuyStartDate)}
      </div>
    </div>
  )

  // 将团购单数据转换为Select组件需要的格式
  const options = allGroupBuy.map(groupBuy => ({
    value: groupBuy.id,
    label: groupBuy.name,
    groupBuyStartDate: groupBuy.groupBuyStartDate
  }))

  return (
    <Select
      value={value}
      onChange={onChange}
      placeholder="请选择团购单"
      loading={getAllGroupBuyLoading}
      showSearch
      allowClear
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

export default GroupBuySelector
