import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
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

  // 添加按钮
  onAdd?: () => void
  addButtonText?: string

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
  onAdd,
  addButtonText = '添加',
  extra
}: SearchToolbarProps) => {
  return (
    <div className="mt-2 w-full border-t border-gray-100 pt-2">
      {/* 单行布局：左边统计信息，右边排序选择器和操作按钮 */}
      <div className="flex w-full items-center justify-between gap-3">
        {/* 左边：统计信息和添加按钮 */}
        <div className="flex items-center gap-3">
          <div className="whitespace-nowrap text-sm text-gray-600">
            共 {totalCount} {countLabel}
          </div>
          {onAdd && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={onAdd}
            >
              <span className="hidden md:inline">{addButtonText}</span>
            </Button>
          )}
        </div>

        {/* 右边：排序选择器、操作按钮和自定义内容 */}
        <div className="flex items-center gap-3">
          {/* 排序选择器 */}
          {sortOptions && sortValue && onSortChange && (
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-sm font-medium text-gray-700">排序：</span>
              <Select
                value={sortValue}
                style={{ width: 160 }}
                onChange={onSortChange}
                options={sortOptions}
                popupMatchSelectWidth={200}
              />
            </div>
          )}

          {/* 操作按钮 */}
          {(onSearch || onReset) && (
            <div className="flex items-center gap-2">
              {onSearch && (
                <Button
                  color="primary"
                  variant="outlined"
                  icon={<SearchOutlined />}
                  onClick={onSearch}
                  loading={searchLoading}
                >
                  <span className="hidden md:inline">搜索</span>
                </Button>
              )}
              {onReset && (
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onReset}
                >
                  <span className="hidden md:inline">重置</span>
                </Button>
              )}
            </div>
          )}

          {/* 自定义内容 */}
          {extra}
        </div>
      </div>
    </div>
  )
}

export default SearchToolbar
