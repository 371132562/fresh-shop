import {
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined
} from '@ant-design/icons'
import { Button, Segmented, Select } from 'antd'
import type { ReactNode } from 'react'

type SortOption = {
  label: string
  value: string
}

type SearchToolbarProps = {
  // 排序相关
  sortFieldOptions?: SortOption[]
  sortFieldValue?: string
  onSortFieldChange?: (value: string) => void
  sortOrderValue?: 'asc' | 'desc'
  onSortOrderChange?: (value: 'asc' | 'desc') => void

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
  sortFieldOptions,
  sortFieldValue,
  onSortFieldChange,
  sortOrderValue = 'desc',
  onSortOrderChange,
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
      {/* 响应式布局：
          - <lg: 左右两组分行显示
          - <md: 右侧组的排序与按钮也分行显示
      */}
      <div className="flex w-full flex-col items-stretch justify-between gap-3 lg:flex-row lg:items-center">
        {/* 左侧组：统计信息与添加按钮 */}
        <div className="flex items-center justify-between gap-3 lg:justify-start">
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

        {/* 右侧组：排序、按钮、自定义内容 */}
        <div className="flex flex-col items-stretch justify-between gap-2 md:flex-row md:items-center md:gap-3">
          {/* 排序选择器 */}
          {typeof sortFieldValue === 'string' &&
          !!sortFieldOptions &&
          !!onSortFieldChange &&
          !!sortOrderValue &&
          !!onSortOrderChange ? (
            <div className="flex w-full flex-col items-stretch gap-1 sm:flex-row sm:items-center sm:gap-2 md:w-auto">
              <span className="whitespace-nowrap text-sm font-medium text-gray-700">排序：</span>

              {/* 字段选择 + 顺序切换 */}
              {typeof sortFieldValue === 'string' &&
              !!sortFieldOptions &&
              !!onSortFieldChange &&
              !!sortOrderValue &&
              !!onSortOrderChange ? (
                <div className="flex w-full flex-col items-stretch gap-2 sm:flex-row sm:items-center md:w-auto">
                  <div className="w-full md:w-[180px]">
                    <Select
                      value={sortFieldValue}
                      style={{ width: '100%' }}
                      onChange={onSortFieldChange}
                      options={sortFieldOptions}
                      popupMatchSelectWidth={240}
                    />
                  </div>
                  <Segmented
                    value={sortOrderValue}
                    onChange={v => onSortOrderChange(v as 'asc' | 'desc')}
                    options={[
                      {
                        label: (
                          <div className="flex items-center gap-1">
                            <SortAscendingOutlined />
                            <span>升序</span>
                          </div>
                        ),
                        value: 'asc'
                      },
                      {
                        label: (
                          <div className="flex items-center gap-1">
                            <SortDescendingOutlined />
                            <span>降序</span>
                          </div>
                        ),
                        value: 'desc'
                      }
                    ]}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {/* 操作按钮 */}
          {(onSearch || onReset) && (
            <div className="flex w-full flex-row flex-wrap items-center gap-2 md:w-auto">
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
