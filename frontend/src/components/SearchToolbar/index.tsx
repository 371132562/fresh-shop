import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Select } from 'antd'
import type { ReactNode } from 'react'

type SortOption = {
  label: string
  value: string
}

type SearchToolbarProps = {
  // 排序相关
  sortOptions?: SortOption[]
  sortValue?: string
  onSortChange?: (value: string) => void

  // 操作按钮
  onSearch?: () => void
  onReset?: () => void
  searchLoading?: boolean

  // 统计信息
  totalCount?: number
  countLabel?: string

  // 自定义内容
  extra?: ReactNode
}

const SearchToolbar = ({
  sortOptions,
  sortValue,
  onSortChange,
  onSearch,
  onReset,
  searchLoading = false,
  totalCount = 0,
  countLabel = '条',
  extra
}: SearchToolbarProps) => {
  return (
    <div className="mt-2 w-full border-t border-gray-100 pt-2">
      {/* 第一行：排序选择器 */}
      {sortOptions && sortValue && onSortChange && (
        <div className="mb-3 flex items-center gap-2">
          <span className="whitespace-nowrap text-sm font-medium text-gray-700">排序方式：</span>
          <Select
            value={sortValue}
            style={{ width: 180 }}
            onChange={onSortChange}
            options={sortOptions}
            popupMatchSelectWidth={200}
          />
        </div>
      )}

      {/* 第二行：操作按钮、自定义内容和统计信息 */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* 操作按钮 */}
          {(onSearch || onReset) && (
            <div className="flex items-center gap-2">
              {onSearch && (
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={onSearch}
                  loading={searchLoading}
                >
                  搜索
                </Button>
              )}
              {onReset && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onReset}
                >
                  重置
                </Button>
              )}
            </div>
          )}

          {/* 自定义内容 */}
          {extra}
        </div>

        {/* 统计信息 */}
        <div className="whitespace-nowrap text-sm text-gray-600">
          共 {totalCount} {countLabel}
        </div>
      </div>
    </div>
  )
}

export default SearchToolbar
