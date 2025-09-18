import { BarChartOutlined } from '@ant-design/icons'
import { Badge, Card, Empty, List, Progress, Segmented, Tag, Tooltip } from 'antd'
import type { ProductCategoryStat } from 'fresh-shop-backend/types/dto'
import React, { useMemo, useState } from 'react'

import useGlobalSettingStore from '@/stores/globalSettingStore'

// 组件入参类型定义
// data: 分类统计数据
// title: 卡片标题
// loading: 加载状态

type ProductCategoryAnalysisProps = {
  data: ProductCategoryStat[]
  title?: string
  loading?: boolean
}

/**
 * 商品分类统计分析组件（重设计）
 * - 列表样式 + 叠加进度条，突出销售额占比/利润占比
 * - 辅助展示：利润率、商品、团购单、订单、客户（缺失跳过）
 */
const ProductCategoryAnalysis: React.FC<ProductCategoryAnalysisProps> = ({
  data,
  title = '商品分类统计',
  loading = false
}) => {
  const formatCurrency = (value: number) => `¥${(value || 0).toFixed(2)}`
  const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`

  const globalSetting = useGlobalSettingStore(state => state.globalSetting)
  // 默认利润占比（敏感模式下强制为销售额占比）
  const [percentMetric, setPercentMetric] = useState<'revenue' | 'profit'>(
    globalSetting?.value?.sensitive ? 'revenue' : 'profit'
  )

  // 计算总销售额/总利润
  const totals = useMemo(() => {
    const totalRevenue = (data || []).reduce((sum, item) => sum + (item.totalRevenue || 0), 0)
    const totalProfit = (data || []).reduce((sum, item) => sum + (item.totalProfit || 0), 0)
    return { totalRevenue, totalProfit }
  }, [data])

  // 根据当前指标排序（从高到低）
  const sortedData = useMemo(() => {
    const copy = [...(data || [])]
    return copy.sort((a, b) => {
      const av = percentMetric === 'revenue' ? a.totalRevenue || 0 : a.totalProfit || 0
      const bv = percentMetric === 'revenue' ? b.totalRevenue || 0 : b.totalProfit || 0
      return bv - av
    })
  }, [data, percentMetric])

  const effectiveMetric = globalSetting?.value?.sensitive ? 'revenue' : percentMetric
  const progressColor = effectiveMetric === 'revenue' ? '#34d399' : '#f43f5e'
  const percentTitle = effectiveMetric === 'revenue' ? '销售额占比' : '利润占比'

  return (
    <Card
      title={
        <div className="flex h-12 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <BarChartOutlined className="text-green-500" />
            <span className="text-lg font-medium">{title}</span>
          </div>
          <Segmented
            size="small"
            value={effectiveMetric}
            onChange={val => setPercentMetric(val as 'revenue' | 'profit')}
            options={
              globalSetting?.value?.sensitive
                ? [{ label: '销售额占比', value: 'revenue' }]
                : [
                    { label: '利润占比', value: 'profit' },
                    { label: '销售额占比', value: 'revenue' }
                  ]
            }
          />
        </div>
      }
      size="small"
      loading={loading}
    >
      <div className="max-h-80 overflow-y-auto pr-3">
        {sortedData && sortedData.length > 0 ? (
          <List
            dataSource={sortedData}
            split={false}
            renderItem={item => {
              const revenue = item.totalRevenue || 0
              const profit = item.totalProfit || 0
              const orders = item.orderCount || 0
              const products = item.productCount || 0
              const groupBuys = item.groupBuyCount || 0
              const margin = revenue > 0 ? (profit / revenue) * 100 : 0

              const base = effectiveMetric === 'revenue' ? totals.totalRevenue : totals.totalProfit
              const value = effectiveMetric === 'revenue' ? revenue : profit
              const percent = base > 0 ? (value / base) * 100 : 0

              const titleAmount = effectiveMetric === 'profit' ? profit : revenue

              return (
                <List.Item className="px-2 py-2">
                  <div className="flex w-full items-start gap-3">
                    {/* 分类徽标（根据盈利率高低轻量提示） */}
                    <div className="pt-1">
                      <Badge color={margin >= 30 ? 'green' : margin >= 15 ? 'blue' : 'volcano'} />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* 标题行：分类名 + 金额（随占比切换显示利润或销售额） */}
                      <div className="flex items-center justify-between gap-2">
                        <Tooltip
                          title={item.categoryName}
                          placement="top"
                        >
                          <div className="truncate text-base font-medium text-gray-800">
                            {item.categoryName}
                          </div>
                        </Tooltip>
                        <div className="whitespace-nowrap text-base font-bold text-blue-400">
                          {formatCurrency(titleAmount)}
                        </div>
                      </div>

                      {/* 占比进度条 */}
                      <div className="mt-1">
                        <Tooltip title={`${percentTitle} ${formatPercent(percent)}`}>
                          <Progress
                            percent={Math.round(percent)}
                            showInfo={false}
                            size="small"
                            strokeColor={progressColor}
                          />
                        </Tooltip>
                        <div className="mt-1 text-sm text-gray-500">
                          {percentTitle} {formatPercent(percent)}
                        </div>
                      </div>

                      {/* 辅助指标：按顺序 渲染（缺失自动跳过） */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        {!globalSetting?.value?.sensitive && (
                          <Tag
                            color="blue"
                            className="m-0"
                          >
                            利润率 {formatPercent(margin)}
                          </Tag>
                        )}
                        {products ? (
                          <Tag
                            color="blue"
                            className="m-0"
                          >
                            商品 {products}
                          </Tag>
                        ) : null}
                        {groupBuys ? (
                          <Tag
                            color="blue"
                            className="m-0"
                          >
                            团购单 {groupBuys}
                          </Tag>
                        ) : null}
                        {orders ? (
                          <Tag
                            color="blue"
                            className="m-0"
                          >
                            订单 {orders}
                          </Tag>
                        ) : null}
                        {/* 客户字段无，跳过 */}
                      </div>
                    </div>
                  </div>
                </List.Item>
              )
            }}
          />
        ) : (
          <div className="flex items-center justify-center py-8">
            <Empty
              description="暂无分类数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

export default React.memo(ProductCategoryAnalysis)
