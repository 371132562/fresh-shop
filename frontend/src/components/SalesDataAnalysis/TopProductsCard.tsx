import { TrophyOutlined } from '@ant-design/icons'
import { Badge, Card, Empty, List, Progress, Segmented, Tag, Tooltip } from 'antd'
import type { TopProductItem } from 'fresh-shop-backend/types/dto'
import React, { useMemo, useState } from 'react'

// 组件入参类型定义
// data: 热销商品数据列表
// title: 卡片标题，可选
// loading: 加载状态

type TopProductsCardProps = {
  data: TopProductItem[]
  title?: string
  loading?: boolean
}

/**
 * 热销商品排行公共组件（重设计）
 * - 使用列表 + 进度条展示占比，适配移动端阅读
 * - 支持销售额占比/利润占比切换
 */
const TopProductsCard: React.FC<TopProductsCardProps> = ({
  data,
  title = '热销商品排行',
  loading = false
}) => {
  const formatCurrency = (value: number) => `¥${(value || 0).toFixed(2)}`
  const formatPercent = (value: number) => `${(value || 0).toFixed(2)}%`

  // 默认利润占比
  const [percentMetric, setPercentMetric] = useState<'revenue' | 'profit'>('profit')

  // 计算总销售额与总利润
  const totals = useMemo(() => {
    const totalRevenue = (data || []).reduce((sum, item) => sum + (item.totalRevenue || 0), 0)
    const totalProfit = (data || []).reduce((sum, item) => sum + (item.totalProfit || 0), 0)
    return { totalRevenue, totalProfit }
  }, [data])

  // 按当前占比指标从高到低排序
  const sortedData = useMemo(() => {
    const copy = [...(data || [])]
    return copy.sort((a, b) => {
      const av = percentMetric === 'revenue' ? a.totalRevenue || 0 : a.totalProfit || 0
      const bv = percentMetric === 'revenue' ? b.totalRevenue || 0 : b.totalProfit || 0
      return bv - av
    })
  }, [data, percentMetric])

  const progressColor = percentMetric === 'revenue' ? '#34d399' : '#f43f5e'
  const percentTitle = percentMetric === 'revenue' ? '销售额占比' : '利润占比'

  return (
    <Card
      title={
        <div className="flex h-12 items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TrophyOutlined className="text-orange-500" />
            <span className="text-lg font-medium">{title}</span>
          </div>
          <Segmented
            size="small"
            value={percentMetric}
            onChange={val => setPercentMetric(val as 'revenue' | 'profit')}
            options={[
              { label: '利润占比', value: 'profit' },
              { label: '销售额占比', value: 'revenue' }
            ]}
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
              const groupBuys = item.groupBuyCount || 0
              const margin = revenue > 0 ? (profit / revenue) * 100 : 0

              const base = percentMetric === 'revenue' ? totals.totalRevenue : totals.totalProfit
              const value = percentMetric === 'revenue' ? revenue : profit
              const percent = base > 0 ? (value / base) * 100 : 0

              const titleAmount = percentMetric === 'profit' ? profit : revenue

              return (
                <List.Item className="px-2 py-2">
                  <div className="flex w-full items-start gap-3">
                    {/* 排名圆形徽标 */}
                    <div className="pt-1">
                      <Badge color={margin >= 30 ? 'green' : margin >= 15 ? 'blue' : 'volcano'} />
                    </div>

                    {/* 主体内容区域 */}
                    <div className="min-w-0 flex-1">
                      {/* 标题行：商品名 + 金额（随占比切换显示利润或销售额） */}
                      <div className="flex items-center justify-between gap-2">
                        <Tooltip
                          title={item.productName}
                          placement="top"
                        >
                          <div className="truncate text-base font-medium text-gray-800">
                            {item.productName}
                          </div>
                        </Tooltip>
                        <div
                          className="whitespace-nowrap text-base font-semibold"
                          style={{ color: progressColor }}
                        >
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

                      {/* 辅助指标：按顺序 渲染（不支持的数据跳过） */}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Tag
                          color="blue"
                          className="m-0"
                        >
                          利润率 {formatPercent(margin)}
                        </Tag>
                        <Tag
                          color="blue"
                          className="m-0"
                        >
                          团购单 {groupBuys}
                        </Tag>
                        <Tag
                          color="blue"
                          className="m-0"
                        >
                          订单 {orders}
                        </Tag>
                        {/* 客户字段已移除，跳过 */}
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
              description="暂无产品数据"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </div>
        )}
      </div>
    </Card>
  )
}

export default React.memo(TopProductsCard)
